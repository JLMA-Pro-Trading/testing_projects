#!/usr/bin/env node
/**
 * Full Backtest with Conformal Prediction
 * Uses ONLY @neural-trader packages:
 * - @neural-trader/core (calculateRsi, calculateSma, etc.)
 * - @neural-trader/predictor (SplitConformalPredictor)
 */

const core = require('@neural-trader/core');
const { calculateRsi, calculateSma, calculateSharpeRatio, calculateSortinoRatio } = core;
const { SplitConformalPredictor, AbsoluteScore, AdaptiveConformalPredictor } = require('@neural-trader/predictor');
const config = require('./config.json');

// Fetch data using curl
function curlFetch(url) {
  const { execSync } = require('child_process');
  const result = execSync(`curl -s --connect-timeout 15 "${url}"`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(result);
}

// Fetch candle data
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

// Feature extraction for ML prediction
function extractFeatures(candles, index) {
  const minWindow = 15;
  if (index < minWindow) return null;

  const window = candles.slice(index - minWindow, index + 1);
  const closes = window.map(c => c.close);
  const currentClose = closes[closes.length - 1];

  const features = [];

  // Returns at different horizons
  const returnPeriods = [1, 2, 3, 5, 10, 15];
  for (const period of returnPeriods) {
    if (closes.length > period) {
      features.push((currentClose - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]);
    } else {
      features.push(0);
    }
  }

  // RSI normalized (using @neural-trader/core)
  const rsi = calculateRsi(closes, Math.min(7, closes.length - 1));
  features.push((rsi[rsi.length - 1] || 50) / 100);

  // SMA ratios (using @neural-trader/core)
  for (const p of [3, 5, 10]) {
    const sma = calculateSma(closes, Math.min(p, closes.length));
    features.push(currentClose / (sma[sma.length - 1] || currentClose) - 1);
  }

  // Volatility
  const returns = [];
  for (let i = 1; i < Math.min(minWindow, closes.length); i++) {
    returns.push((closes[closes.length - i] - closes[closes.length - i - 1]) / closes[closes.length - i - 1]);
  }
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  features.push(meanReturn);

  return features;
}

// Simple linear regression for point predictions
function trainLinearRegression(X, y) {
  // Calculate mean of features and target
  const n = X.length;
  const numFeatures = X[0].length;

  const meanX = new Array(numFeatures).fill(0);
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < numFeatures; j++) {
      meanX[j] += X[i][j] / n;
    }
  }

  // Simple weighted average prediction based on correlations
  const correlations = new Array(numFeatures).fill(0);
  for (let j = 0; j < numFeatures; j++) {
    let cov = 0, varX = 0, varY = 0;
    for (let i = 0; i < n; i++) {
      const dx = X[i][j] - meanX[j];
      const dy = y[i] - meanY;
      cov += dx * dy;
      varX += dx * dx;
      varY += dy * dy;
    }
    correlations[j] = varX > 0 ? cov / Math.sqrt(varX * varY) : 0;
  }

  // Normalize correlations for weights
  const totalCorr = correlations.reduce((a, b) => a + Math.abs(b), 0) || 1;
  const weights = correlations.map(c => c / totalCorr);

  return {
    predict: (features) => {
      let prediction = 0;
      for (let j = 0; j < numFeatures; j++) {
        prediction += weights[j] * (features[j] - meanX[j]);
      }
      return prediction + meanY;
    },
    meanY,
    weights
  };
}

// Strategy with Conformal Prediction intervals
class ConformalStrategy {
  constructor(candles, trainSplit = 0.7) {
    this.candles = candles;
    this.predictor = null;
    this.model = null;
    this.trainSplit = trainSplit;
    this.horizon = 5; // 5-minute ahead prediction
  }

  async train() {
    console.log('\n🧠 Training model with conformal prediction...');

    // Prepare training data
    const X = [];
    const y = [];
    const splitIdx = Math.floor(this.candles.length * this.trainSplit);

    for (let i = 15; i < splitIdx - this.horizon; i++) {
      const features = extractFeatures(this.candles, i);
      if (features) {
        X.push(features);
        const futureReturn = (this.candles[i + this.horizon].close - this.candles[i].close) / this.candles[i].close;
        y.push(futureReturn);
      }
    }

    console.log(`   Training samples: ${X.length}`);

    // Train simple model
    this.model = trainLinearRegression(X, y);

    // Generate predictions for calibration
    const predictions = X.map(x => this.model.predict(x));

    // Initialize conformal predictor from @neural-trader/predictor
    this.predictor = new SplitConformalPredictor(
      { alpha: 0.1, calibrationSize: 1000 },  // 90% coverage
      new AbsoluteScore()
    );

    // Calibrate with predictions and actuals
    await this.predictor.calibrate(predictions, y);

    const stats = this.predictor.getStats();
    console.log(`   Conformal predictor calibrated:`);
    console.log(`     - Quantile: ${(stats.quantile * 100).toFixed(4)}%`);
    console.log(`     - Calibration samples: ${stats.nCalibration}`);

    return this;
  }

  getSignal(windowCandles) {
    if (!this.model || !this.predictor || windowCandles.length < 20) {
      return { signal: 'HOLD', confidence: 0, reasons: ['Not ready'], interval: null };
    }

    // Extract features
    const features = extractFeatures(windowCandles, windowCandles.length - 1);
    if (!features) {
      return { signal: 'HOLD', confidence: 0, reasons: ['No features'], interval: null };
    }

    // Get point prediction
    const pointPrediction = this.model.predict(features);

    // Get conformal prediction interval
    const interval = this.predictor.predict(pointPrediction);

    // Decision logic based on interval
    const width = interval.width();
    const threshold = 0.0002; // 0.02% minimum signal strength

    // Only trade if interval doesn't span zero (high confidence direction)
    if (interval.lower > threshold) {
      // Confident bullish - entire interval is positive
      const conf = Math.min(interval.lower / width, 1);
      return {
        signal: 'BUY',
        confidence: conf,
        reasons: [`Prediction: ${(pointPrediction * 100).toFixed(4)}%`, `90% CI: [${(interval.lower * 100).toFixed(4)}%, ${(interval.upper * 100).toFixed(4)}%]`],
        interval
      };
    }

    if (interval.upper < -threshold) {
      // Confident bearish - entire interval is negative
      const conf = Math.min(Math.abs(interval.upper) / width, 1);
      return {
        signal: 'SELL',
        confidence: conf,
        reasons: [`Prediction: ${(pointPrediction * 100).toFixed(4)}%`, `90% CI: [${(interval.lower * 100).toFixed(4)}%, ${(interval.upper * 100).toFixed(4)}%]`],
        interval
      };
    }

    return {
      signal: 'HOLD',
      confidence: 0,
      reasons: [`Uncertain: CI spans zero [${(interval.lower * 100).toFixed(4)}%, ${(interval.upper * 100).toFixed(4)}%]`],
      interval
    };
  }
}

// RSI Strategy with package functions
function rsiStrategy(candles) {
  if (candles.length < 20) return { signal: 'HOLD', confidence: 0, reasons: ['Warmup'] };

  const closes = candles.map(c => c.close);
  const rsi = calculateRsi(closes, 14);
  const currentRsi = rsi[rsi.length - 1];

  if (currentRsi === undefined || currentRsi === 0) {
    return { signal: 'HOLD', confidence: 0, reasons: ['No RSI'] };
  }

  if (currentRsi < 25) {
    return { signal: 'BUY', confidence: (25 - currentRsi) / 25, reasons: [`RSI=${currentRsi.toFixed(1)} oversold`] };
  }
  if (currentRsi > 75) {
    return { signal: 'SELL', confidence: (currentRsi - 75) / 25, reasons: [`RSI=${currentRsi.toFixed(1)} overbought`] };
  }

  return { signal: 'HOLD', confidence: 0, reasons: [`RSI=${currentRsi.toFixed(1)} neutral`] };
}

// Simple Backtest
class SimpleBacktest {
  constructor(candles, configObj) {
    this.candles = candles;
    this.initialCapital = configObj.backtesting.initial_capital;
    this.commission = configObj.backtesting.commission;
    this.stopLossPct = configObj.risk.stop_loss_pct;
    this.takeProfitPct = configObj.risk.take_profit_pct;
  }

  runBacktest(strategyFn, minConfidence = 0.3) {
    let capital = this.initialCapital;
    let position = null;
    const trades = [];
    const equityCurve = [capital];

    for (let i = 50; i < this.candles.length; i++) {
      const windowCandles = this.candles.slice(0, i + 1);
      const currentCandle = this.candles[i];
      const { signal, confidence } = strategyFn(windowCandles);

      // Check stop loss / take profit
      if (position) {
        const pnlPct = position.side === 'long'
          ? (currentCandle.close - position.entryPrice) / position.entryPrice
          : (position.entryPrice - currentCandle.close) / position.entryPrice;

        if (pnlPct <= -this.stopLossPct) {
          const pnl = position.size * pnlPct - position.size * this.commission;
          capital += pnl;
          trades.push({ side: position.side, entryPrice: position.entryPrice, exitPrice: currentCandle.close, pnl, reason: 'Stop Loss' });
          position = null;
        } else if (pnlPct >= this.takeProfitPct) {
          const pnl = position.size * pnlPct - position.size * this.commission;
          capital += pnl;
          trades.push({ side: position.side, entryPrice: position.entryPrice, exitPrice: currentCandle.close, pnl, reason: 'Take Profit' });
          position = null;
        }
      }

      // Process signal
      if (!position && signal !== 'HOLD' && confidence > minConfidence) {
        const size = capital * 0.95;
        position = { side: signal === 'BUY' ? 'long' : 'short', entryPrice: currentCandle.close, size: size - size * this.commission };
      } else if (position) {
        if ((position.side === 'long' && signal === 'SELL') || (position.side === 'short' && signal === 'BUY')) {
          const pnlPct = position.side === 'long'
            ? (currentCandle.close - position.entryPrice) / position.entryPrice
            : (position.entryPrice - currentCandle.close) / position.entryPrice;
          const pnl = position.size * pnlPct - position.size * this.commission;
          capital += pnl;
          trades.push({ side: position.side, entryPrice: position.entryPrice, exitPrice: currentCandle.close, pnl, reason: 'Signal Reversal' });
          position = null;
        }
      }
      equityCurve.push(capital);
    }

    // Close open position
    if (position) {
      const lastCandle = this.candles[this.candles.length - 1];
      const pnlPct = position.side === 'long'
        ? (lastCandle.close - position.entryPrice) / position.entryPrice
        : (position.entryPrice - lastCandle.close) / position.entryPrice;
      const pnl = position.size * pnlPct - position.size * this.commission;
      capital += pnl;
      trades.push({ side: position.side, entryPrice: position.entryPrice, exitPrice: lastCandle.close, pnl, reason: 'End of Test' });
    }

    // Calculate metrics
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i-1]) / equityCurve[i-1]);
    }

    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl <= 0);

    return {
      initialCapital: this.initialCapital,
      finalCapital: capital,
      metrics: {
        totalTrades: trades.length,
        winners: winners.length,
        losers: losers.length,
        winRate: trades.length > 0 ? winners.length / trades.length : 0,
        profitFactor: losers.reduce((a, t) => a + Math.abs(t.pnl), 0) > 0
          ? winners.reduce((a, t) => a + t.pnl, 0) / losers.reduce((a, t) => a + Math.abs(t.pnl), 0) : 0,
        maxDrawdown: this.calculateMaxDrawdown(equityCurve),
        sharpeRatio: returns.length > 0 ? calculateSharpeRatio(returns, 0, Math.sqrt(252 * 24 * 60)) : 0,
        sortinoRatio: returns.length > 0 ? calculateSortinoRatio(returns, 0, Math.sqrt(252 * 24 * 60)) : 0
      },
      trades
    };
  }

  calculateMaxDrawdown(equityCurve) {
    let maxDD = 0, peak = equityCurve[0];
    for (const equity of equityCurve) {
      if (equity > peak) peak = equity;
      const dd = (peak - equity) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }
}

// Main
async function main() {
  console.log('═'.repeat(60));
  console.log('📊 FULL BACKTEST with Conformal Prediction');
  console.log('   Using: @neural-trader/core + @neural-trader/predictor');
  console.log('═'.repeat(60));

  try {
    const candles = await fetchData(15000);

    const splitIdx = Math.floor(candles.length * 0.7);
    const testCandles = candles.slice(splitIdx - 50);

    console.log(`\nTest period: ${testCandles.length} candles`);

    // 1. RSI Strategy (baseline)
    console.log('\n📈 Strategy 1: RSI Mean Reversion');
    console.log('─'.repeat(40));
    const engine1 = new SimpleBacktest(testCandles, config);
    const results1 = engine1.runBacktest(rsiStrategy);
    printResults(results1);

    // 2. Conformal Prediction Strategy
    console.log('\n📈 Strategy 2: Conformal Prediction');
    console.log('─'.repeat(40));

    const conformalStrategy = new ConformalStrategy(candles, 0.7);
    await conformalStrategy.train();

    const engine2 = new SimpleBacktest(testCandles, config);
    const results2 = engine2.runBacktest((c) => conformalStrategy.getSignal(c), 0.1);
    printResults(results2);

    // Buy & Hold
    const startPrice = testCandles[0].close;
    const endPrice = testCandles[testCandles.length - 1].close;
    const buyHoldReturn = (endPrice - startPrice) / startPrice;
    console.log(`\n📊 Buy & Hold Return: ${(buyHoldReturn * 100).toFixed(2)}%`);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Backtest Complete');
    console.log('   Packages used:');
    console.log('   - @neural-trader/core (calculateRsi, calculateSma, Sharpe, Sortino)');
    console.log('   - @neural-trader/predictor (SplitConformalPredictor)');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

function printResults(results) {
  const { metrics, trades, initialCapital, finalCapital } = results;
  const totalReturn = (finalCapital - initialCapital) / initialCapital;

  console.log(`   Trades: ${trades.length}`);
  console.log(`   Return: ${(totalReturn * 100).toFixed(2)}%`);
  console.log(`   Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
  console.log(`   Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
  console.log(`   Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`   Sharpe: ${metrics.sharpeRatio.toFixed(2)}`);
}

main().catch(console.error);
