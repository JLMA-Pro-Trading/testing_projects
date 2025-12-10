#!/usr/bin/env node
/**
 * Pure Technical Analysis Backtest - No ML
 * Uses only RSI mean-reversion
 */

const core = require('@neural-trader/core');
const { calculateRsi, calculateSma } = core;
const config = require('./config.json');
const { BacktestEngine } = require('./src/backtesting');

function curlFetch(url) {
  const { execSync } = require('child_process');
  const result = execSync(`curl -s --connect-timeout 15 "${url}"`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(result);
}

async function fetchData(limit = 10000) {
  console.log(`\n📊 Fetching BTCUSDT 1m data...`);
  const allCandles = [];
  let startTime = Date.now() - limit * 60 * 1000;

  while (allCandles.length < limit) {
    const url = `https://testnet.binancefuture.com/fapi/v1/klines?symbol=BTCUSDT&interval=1m&startTime=${startTime}&limit=1000`;
    const rawData = curlFetch(url);
    if (!rawData.length) break;

    const candles = rawData.map(d => ({
      timestamp: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5])
    }));

    allCandles.push(...candles);
    startTime = candles[candles.length - 1].timestamp + 60000;
    process.stdout.write(`   Loaded: ${allCandles.length} candles\r`);

    if (rawData.length < 1000) break;
  }

  console.log(`\n✅ Fetched ${allCandles.length} candles`);
  return allCandles;
}

// Pure RSI Mean Reversion Strategy
function rsiMeanReversionStrategy(candles) {
  if (candles.length < 20) {
    return { signal: 'HOLD', confidence: 0, reasons: ['Warmup'] };
  }

  const closes = candles.map(c => c.close);
  const rsi = calculateRsi(closes, 14); // Use RSI(14) for more stability
  const currentRsi = rsi[rsi.length - 1];

  if (currentRsi === undefined) {
    return { signal: 'HOLD', confidence: 0, reasons: ['No RSI'] };
  }

  // Strong oversold - BUY
  if (currentRsi < 25) {
    const conf = (25 - currentRsi) / 25;
    return { signal: 'BUY', confidence: conf, reasons: [`RSI=${currentRsi.toFixed(1)} (oversold)`] };
  }

  // Strong overbought - SELL
  if (currentRsi > 75) {
    const conf = (currentRsi - 75) / 25;
    return { signal: 'SELL', confidence: conf, reasons: [`RSI=${currentRsi.toFixed(1)} (overbought)`] };
  }

  return { signal: 'HOLD', confidence: 0, reasons: [`RSI=${currentRsi.toFixed(1)} (neutral)`] };
}

// SMA Crossover Strategy
function smaCrossoverStrategy(candles) {
  if (candles.length < 50) {
    return { signal: 'HOLD', confidence: 0, reasons: ['Warmup'] };
  }

  const closes = candles.map(c => c.close);
  const smaFast = calculateSma(closes, 10);
  const smaSlow = calculateSma(closes, 30);

  const currentFast = smaFast[smaFast.length - 1];
  const currentSlow = smaSlow[smaSlow.length - 1];
  const prevFast = smaFast[smaFast.length - 2];
  const prevSlow = smaSlow[smaSlow.length - 2];

  // Bullish crossover
  if (prevFast <= prevSlow && currentFast > currentSlow) {
    return { signal: 'BUY', confidence: 0.6, reasons: ['SMA(10) crossed above SMA(30)'] };
  }

  // Bearish crossover
  if (prevFast >= prevSlow && currentFast < currentSlow) {
    return { signal: 'SELL', confidence: 0.6, reasons: ['SMA(10) crossed below SMA(30)'] };
  }

  return { signal: 'HOLD', confidence: 0, reasons: ['No crossover'] };
}

// Combined Technical Strategy
function combinedTechnicalStrategy(candles) {
  const rsiSignal = rsiMeanReversionStrategy(candles);
  const smaSignal = smaCrossoverStrategy(candles);

  // If both agree, strong signal
  if (rsiSignal.signal === smaSignal.signal && rsiSignal.signal !== 'HOLD') {
    return {
      signal: rsiSignal.signal,
      confidence: Math.min(rsiSignal.confidence + smaSignal.confidence, 1),
      reasons: [...rsiSignal.reasons, ...smaSignal.reasons]
    };
  }

  // RSI only (mean reversion tends to work better)
  if (rsiSignal.signal !== 'HOLD' && rsiSignal.confidence > 0.3) {
    return rsiSignal;
  }

  return { signal: 'HOLD', confidence: 0, reasons: ['No clear signal'] };
}

async function main() {
  console.log('═'.repeat(60));
  console.log('📊 TECHNICAL ANALYSIS BACKTEST (No ML)');
  console.log('═'.repeat(60));

  try {
    const candles = await fetchData(15000);

    // Split 80/20
    const splitIdx = Math.floor(candles.length * 0.8);
    const testCandles = candles.slice(splitIdx - 50); // Include warmup

    console.log(`\nTesting on ${testCandles.length} candles\n`);

    // Test each strategy
    const strategies = [
      { name: 'RSI Mean Reversion', fn: rsiMeanReversionStrategy },
      { name: 'SMA Crossover', fn: smaCrossoverStrategy },
      { name: 'Combined Technical', fn: combinedTechnicalStrategy }
    ];

    for (const strategy of strategies) {
      console.log(`\n📈 Testing: ${strategy.name}`);
      console.log('─'.repeat(40));

      const engine = new BacktestEngine(testCandles, config);
      const results = engine.runBacktest(strategy.fn);

      const { metrics, trades, initialCapital, finalCapital } = results;
      const totalReturn = (finalCapital - initialCapital) / initialCapital;

      console.log(`   Trades: ${trades.length}`);
      console.log(`   Return: ${(totalReturn * 100).toFixed(2)}%`);
      console.log(`   Win Rate: ${((metrics.winRate || 0) * 100).toFixed(1)}%`);
      console.log(`   Profit Factor: ${(metrics.profitFactor || 0).toFixed(2)}`);
      console.log(`   Max Drawdown: ${((metrics.maxDrawdown || 0) * 100).toFixed(2)}%`);
      console.log(`   Sharpe: ${(metrics.sharpeRatio || 0).toFixed(2)}`);
    }

    // Buy and Hold comparison
    const startPrice = testCandles[0].close;
    const endPrice = testCandles[testCandles.length - 1].close;
    const buyHoldReturn = (endPrice - startPrice) / startPrice;
    console.log(`\n📊 Buy & Hold Return: ${(buyHoldReturn * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main().catch(console.error);
