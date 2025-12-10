#!/usr/bin/env node
/**
 * Run Backtest - Tests the trading strategy with historical data
 * Usage: node run-backtest.js
 */

const core = require('@neural-trader/core');
const { calculateRsi, calculateSma } = core;
const config = require('./config.json');

const {
  DataPreprocessor,
  trainRidgeRegression,
  trainElasticNet,
  selectFeaturesByCorrelation,
  trainWeightedEnsemble
} = require('./src/regression');

const { BacktestEngine, MetricsCalculator } = require('./src/backtesting');

// Configuration
const SYMBOL = config.trading.symbols[0];
const INTERVAL = config.trading.interval;
const WINDOW_SIZE = config.trading.parameters.window_size || 15;

// Model state
let ensemble = null;
let preprocessor = null;
let selectedFeatures = null;

// Fetch using curl
function curlFetch(url) {
  const { execSync } = require('child_process');
  try {
    const result = execSync(`curl -s --connect-timeout 15 "${url}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    return JSON.parse(result);
  } catch (e) {
    throw new Error(`curl failed: ${e.message}`);
  }
}

// Fetch historical data
async function fetchHistoricalData(months = 1) {
  console.log(`\n📊 Fetching ${SYMBOL} data (${months} months)...`);

  const endpoints = [
    { name: 'Binance Testnet', base: 'https://testnet.binancefuture.com', path: '/fapi/v1/klines' }
  ];

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - months);

  const allCandles = [];
  let currentStart = startDate.getTime();
  const finalEnd = endDate.getTime();
  const msPerCandle = 60 * 1000; // 1 minute

  for (const ep of endpoints) {
    console.log(`   Trying ${ep.name}...`);
    allCandles.length = 0;
    currentStart = startDate.getTime();
    let success = true;

    while (currentStart < finalEnd && success) {
      const batchEnd = Math.min(currentStart + 1000 * msPerCandle, finalEnd);
      const params = new URLSearchParams({
        symbol: SYMBOL,
        interval: INTERVAL,
        startTime: currentStart.toString(),
        endTime: batchEnd.toString(),
        limit: '1000'
      });

      try {
        const url = `${ep.base}${ep.path}?${params}`;
        const rawData = curlFetch(url);

        if (!Array.isArray(rawData) || rawData.length === 0) break;

        const candles = rawData.map(d => ({
          timestamp: d[0],
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5])
        }));

        allCandles.push(...candles);
        currentStart = candles[candles.length - 1].timestamp + msPerCandle;
        process.stdout.write(`   ${ep.name}: ${allCandles.length} candles\r`);
        await new Promise(r => setTimeout(r, 200));
      } catch (error) {
        console.log(`   ${ep.name} error: ${error.message}`);
        success = false;
      }
    }

    if (allCandles.length > 100) {
      console.log(`\n   ✅ ${ep.name} succeeded!`);
      break;
    }
  }

  const uniqueCandles = [...new Map(allCandles.map(c => [c.timestamp, c])).values()];
  uniqueCandles.sort((a, b) => a.timestamp - b.timestamp);
  console.log(`✅ Fetched ${uniqueCandles.length} candles (${(uniqueCandles.length / 1440).toFixed(1)} days)`);
  return uniqueCandles;
}

// Calculate indicators
function calculateIndicators(candles) {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  const rsiPeriod = INTERVAL === '1m' ? 7 : 14;
  const rsi = calculateRsi(closes, rsiPeriod);

  const smaPeriodShort = INTERVAL === '1m' ? 5 : 20;
  const smaPeriodLong = INTERVAL === '1m' ? 15 : 50;
  const smaShort = calculateSma(closes, smaPeriodShort);
  const smaLong = calculateSma(closes, smaPeriodLong);

  const currentClose = closes[closes.length - 1];
  const currentRsi = rsi[rsi.length - 1] || 50;
  const currentSmaShort = smaShort[smaShort.length - 1] || currentClose;
  const currentSmaLong = smaLong[smaLong.length - 1] || currentClose;

  const lookbackPeriod = INTERVAL === '1m' ? 15 : 24;
  const returnsLong = closes.length > lookbackPeriod ?
    (currentClose - closes[closes.length - 1 - lookbackPeriod]) / closes[closes.length - 1 - lookbackPeriod] : 0;

  const volPeriod = INTERVAL === '1m' ? WINDOW_SIZE : 20;
  const avgVolume = volumes.slice(-volPeriod).reduce((a, b) => a + b, 0) / volPeriod;
  const volumeRatio = volumes[volumes.length - 1] / avgVolume;

  return {
    price: currentClose,
    rsi: currentRsi,
    smaShort: currentSmaShort,
    smaLong: currentSmaLong,
    returnsLong,
    volumeRatio,
    trend: currentSmaShort > currentSmaLong ? 'bullish' : 'bearish',
    priceVsSma: (currentClose - currentSmaShort) / currentSmaShort
  };
}

// Feature extraction
function extractFeatures(candles, index) {
  const minWindow = WINDOW_SIZE;
  if (index < minWindow) return null;

  const window = candles.slice(index - minWindow, index + 1);
  const closes = window.map(c => c.close);
  const volumes = window.map(c => c.volume);
  const highs = window.map(c => c.high);
  const lows = window.map(c => c.low);

  const features = [];
  const currentClose = closes[closes.length - 1];

  // Returns
  const returnPeriods = INTERVAL === '1m' ? [1, 2, 3, 5, 10, 15] : [1, 2, 5, 10, 20, 50];
  for (const period of returnPeriods) {
    if (closes.length > period) {
      features.push((currentClose - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]);
    } else {
      features.push(0);
    }
  }

  // RSI
  const rsiPeriod = INTERVAL === '1m' ? 7 : 14;
  const rsi = calculateRsi(closes, Math.min(rsiPeriod, closes.length - 1));
  features.push((rsi[rsi.length - 1] || 50) / 100);

  // SMA ratios
  const smaPeriods = INTERVAL === '1m' ? [3, 5, 10] : [10, 20, 50];
  for (const p of smaPeriods) {
    const sma = calculateSma(closes, Math.min(p, closes.length));
    features.push(currentClose / (sma[sma.length - 1] || currentClose) - 1);
  }

  // Volatility
  const returns = [];
  for (let i = 1; i < Math.min(minWindow, closes.length); i++) {
    returns.push((closes[closes.length - i] - closes[closes.length - i - 1]) / closes[closes.length - i - 1]);
  }
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdReturn = returns.length > 0 ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length) : 0;
  features.push(stdReturn);
  features.push(meanReturn);

  // Volume
  const volPeriod = Math.min(minWindow, volumes.length);
  const avgVol = volumes.slice(-volPeriod).reduce((a, b) => a + b, 0) / volPeriod;
  features.push(avgVol > 0 ? volumes[volumes.length - 1] / avgVol - 1 : 0);
  features.push(0);

  // Range
  const range = (highs[highs.length - 1] - lows[lows.length - 1]) / currentClose;
  const atrPeriod = Math.min(7, window.length);
  const atr = window.slice(-atrPeriod).reduce((sum, c) => sum + (c.high - c.low), 0) / atrPeriod / currentClose;
  features.push(range);
  features.push(atr);

  // Trend
  features.push(0);
  features.push(closes[closes.length - 1] > closes[0] ? 1 : -1);

  // Momentum & acceleration
  const momentum = closes.length >= 3 ? (closes[closes.length - 1] - closes[closes.length - 3]) / closes[closes.length - 3] : 0;
  features.push(momentum);
  features.push(0);

  while (features.length < 20) features.push(0);
  return features.slice(0, 20);
}

// Train model
async function trainModel(candles) {
  console.log('\n🧠 Training Model...');

  const featuresList = [];
  const targets = [];
  const horizon = config.prediction.horizon || 5;

  for (let i = WINDOW_SIZE; i < candles.length - horizon; i++) {
    const feat = extractFeatures(candles, i);
    if (feat) {
      featuresList.push(feat);
      const futureReturn = (candles[i + horizon].close - candles[i].close) / candles[i].close;
      targets.push(futureReturn);
    }
  }

  console.log(`   Samples: ${targets.length}`);

  const splitIdx = Math.floor(featuresList.length * 0.8);
  const trainX = featuresList.slice(0, splitIdx);
  const trainY = targets.slice(0, splitIdx);

  preprocessor = new DataPreprocessor();
  preprocessor.fit(trainX);
  const trainXNorm = preprocessor.transform(trainX);

  selectedFeatures = selectFeaturesByCorrelation(trainXNorm, trainY, 12);
  const trainXSelected = trainXNorm.map(row => selectedFeatures.map(idx => row[idx]));

  ensemble = trainWeightedEnsemble(trainXSelected, trainY, [
    { fn: trainRidgeRegression, lambda: 0.01, weight: 0.3 },
    { fn: trainRidgeRegression, lambda: 0.1, weight: 0.25 },
    { fn: trainElasticNet, lambda: 0.05, weight: 0.25 },
    { fn: trainElasticNet, lambda: 0.1, weight: 0.2 }
  ]);

  console.log('   ✅ Model trained');
}

// Strategy function for backtesting
function tradingStrategy(candles) {
  if (!ensemble || !preprocessor || !selectedFeatures) {
    return { signal: 'HOLD', confidence: 0, reasons: ['Model not trained'] };
  }

  const indicators = calculateIndicators(candles);

  // ML prediction
  const features = extractFeatures(candles, candles.length - 1);
  if (!features) return { signal: 'HOLD', confidence: 0, reasons: ['No features'] };

  const normalized = preprocessor.transform([features])[0];
  const selected = selectedFeatures.map(idx => normalized[idx]);
  const prediction = ensemble.predict(selected);

  // Generate signal
  const threshold = config.prediction.min_signal_strength || 0.0005;

  let mlSignal = 'HOLD';
  let mlConf = 0;

  if (prediction > threshold) {
    mlSignal = 'BUY';
    mlConf = Math.min(prediction * 100, 1);
  } else if (prediction < -threshold) {
    mlSignal = 'SELL';
    mlConf = Math.min(Math.abs(prediction) * 100, 1);
  }

  // Combine with technical signals
  const params = config.trading.parameters;
  let techSignal = 'HOLD';
  let techConf = 0;

  if (indicators.rsi < params.rsi_oversold && indicators.priceVsSma < -params.mean_reversion_threshold) {
    techSignal = 'BUY';
    techConf = 0.6;
  } else if (indicators.rsi > params.rsi_overbought && indicators.priceVsSma > params.mean_reversion_threshold) {
    techSignal = 'SELL';
    techConf = 0.6;
  }

  // Weighted combination
  let buyScore = (mlSignal === 'BUY' ? mlConf * 0.6 : 0) + (techSignal === 'BUY' ? techConf * 0.4 : 0);
  let sellScore = (mlSignal === 'SELL' ? mlConf * 0.6 : 0) + (techSignal === 'SELL' ? techConf * 0.4 : 0);

  // Use configurable threshold (default 0.15 for 1m scalping)
  const signalThreshold = config.trading.parameters.signal_threshold || 0.15;

  if (buyScore > signalThreshold && buyScore > sellScore) {
    return { signal: 'BUY', confidence: buyScore, reasons: ['ML + Technical BUY'] };
  }
  if (sellScore > signalThreshold && sellScore > buyScore) {
    return { signal: 'SELL', confidence: sellScore, reasons: ['ML + Technical SELL'] };
  }

  return { signal: 'HOLD', confidence: 0, reasons: ['No clear signal'] };
}

// Main
async function main() {
  console.log('═'.repeat(60));
  console.log('📊 BACKTEST - Neural Trader BTCUSDT');
  console.log('═'.repeat(60));

  try {
    // Fetch data
    const candles = await fetchHistoricalData(1);

    if (candles.length < 1000) {
      console.log('⚠️  Insufficient data');
      return;
    }

    // Split: first 80% for training, last 20% for testing
    const splitIdx = Math.floor(candles.length * 0.8);
    const trainCandles = candles.slice(0, splitIdx);
    const testCandles = candles.slice(splitIdx - WINDOW_SIZE); // Include warmup

    console.log(`\n📈 Data Split:`);
    console.log(`   Training: ${trainCandles.length} candles`);
    console.log(`   Testing: ${testCandles.length} candles`);

    // Train on first portion
    await trainModel(trainCandles);

    // Backtest on test portion
    console.log('\n🔄 Running Backtest...');
    const engine = new BacktestEngine(testCandles, config);
    const results = engine.runBacktest(tradingStrategy);

    // Display results
    console.log('\n' + '═'.repeat(60));
    console.log('📊 BACKTEST RESULTS');
    console.log('═'.repeat(60));

    const { metrics, trades, initialCapital, finalCapital } = results;
    const startPrice = testCandles[0].close;
    const endPrice = testCandles[testCandles.length - 1].close;
    const buyHoldReturn = (endPrice - startPrice) / startPrice;
    const totalReturn = (finalCapital - initialCapital) / initialCapital;

    console.log(`\n💰 Performance:`);
    console.log(`   Initial Capital: $${initialCapital.toFixed(2)}`);
    console.log(`   Final Equity: $${finalCapital.toFixed(2)}`);
    console.log(`   Total Return: ${(totalReturn * 100).toFixed(2)}%`);
    console.log(`   Buy & Hold Return: ${(buyHoldReturn * 100).toFixed(2)}%`);
    console.log(`   Alpha: ${((totalReturn - buyHoldReturn) * 100).toFixed(2)}%`);

    console.log(`\n📈 Trade Statistics:`);
    console.log(`   Total Trades: ${metrics.totalTrades || trades.length}`);
    console.log(`   Winning Trades: ${metrics.winners || 0}`);
    console.log(`   Losing Trades: ${metrics.losers || 0}`);
    console.log(`   Win Rate: ${((metrics.winRate || 0) * 100).toFixed(1)}%`);
    console.log(`   Profit Factor: ${(metrics.profitFactor || 0).toFixed(2)}`);

    if (metrics.avgWin) {
      console.log(`   Avg Win: $${metrics.avgWin.toFixed(2)}`);
      console.log(`   Avg Loss: $${(metrics.avgLoss || 0).toFixed(2)}`);
    }

    console.log(`\n📉 Risk Metrics:`);
    console.log(`   Max Drawdown: ${((metrics.maxDrawdown || 0) * 100).toFixed(2)}%`);
    console.log(`   Sharpe Ratio: ${(metrics.sharpeRatio || 0).toFixed(2)}`);
    console.log(`   Sortino Ratio: ${(metrics.sortinoRatio || 0).toFixed(2)}`);
    console.log(`   Commissions Paid: $${(metrics.totalCommissions || 0).toFixed(2)}`);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Backtest Complete');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

main().catch(console.error);
