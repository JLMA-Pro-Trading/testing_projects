#!/usr/bin/env node
/**
 * Neural Trading Backtest
 * Uses @neural-trader/core NeuralModel (NHITS, LSTMAttention, Transformer)
 * Combined with @neural-trader/predictor for conformal intervals
 */

const core = require('@neural-trader/core');
const { NeuralModel, calculateRsi, calculateSma, calculateSharpeRatio, calculateSortinoRatio } = core;
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

// Feature extraction
function extractFeatures(candles, index, inputSize = 20) {
  if (index < inputSize) return null;

  const window = candles.slice(index - inputSize, index + 1);
  const closes = window.map(c => c.close);
  const volumes = window.map(c => c.volume);
  const currentClose = closes[closes.length - 1];

  const features = [];

  // Normalized returns for each period
  for (let i = 1; i <= inputSize; i++) {
    if (closes.length > i) {
      features.push((closes[closes.length - 1] - closes[closes.length - 1 - i]) / closes[closes.length - 1 - i]);
    } else {
      features.push(0);
    }
  }

  return features;
}

// Prepare training data
function prepareTrainingData(candles, inputSize, horizon, trainSplit) {
  const splitIdx = Math.floor(candles.length * trainSplit);
  const flatData = [];
  const targets = [];

  for (let i = inputSize; i < splitIdx - horizon; i++) {
    const features = extractFeatures(candles, i, inputSize);
    if (features) {
      flatData.push(...features);
      // Target: return over horizon
      const futureReturn = (candles[i + horizon].close - candles[i].close) / candles[i].close;
      targets.push(futureReturn);
    }
  }

  return { flatData, targets, numSamples: targets.length };
}

// Neural Strategy using @neural-trader/core NeuralModel
class NeuralStrategy {
  constructor(modelType, candles, inputSize = 20, horizon = 5) {
    this.modelType = modelType;
    this.candles = candles;
    this.inputSize = inputSize;
    this.horizon = horizon;
    this.model = null;
    this.conformalPredictor = null;
    this.trained = false;
  }

  async train(trainSplit = 0.7) {
    console.log(`\n🧠 Training ${this.modelType.toUpperCase()} model...`);

    // Create model config
    const modelConfig = {
      modelType: this.modelType,
      inputSize: this.inputSize,
      horizon: this.horizon,
      hiddenSize: 64,
      numLayers: 2,
      dropout: 0.1,
      learningRate: 0.001
    };

    this.model = new NeuralModel(modelConfig);

    // Prepare data
    const { flatData, targets, numSamples } = prepareTrainingData(
      this.candles, this.inputSize, this.horizon, trainSplit
    );

    console.log(`   Training samples: ${numSamples}`);
    console.log(`   Input size: ${this.inputSize}`);
    console.log(`   Horizon: ${this.horizon}`);

    // Training config
    const trainingConfig = {
      epochs: 10,
      batchSize: 64,
      validationSplit: 0.2,
      earlyStoppingPatience: 3,
      useGpu: false
    };

    // Train the model
    const metrics = await this.model.train(flatData, targets, trainingConfig);
    console.log(`   Final train loss: ${metrics[metrics.length - 1].trainLoss.toFixed(6)}`);
    console.log(`   Final val loss: ${metrics[metrics.length - 1].valLoss.toFixed(6)}`);

    // Generate predictions for conformal calibration
    const calibrationPredictions = [];
    const calibrationActuals = [];
    const splitIdx = Math.floor(this.candles.length * trainSplit);

    // Use last 20% of training data for calibration
    const calibStart = Math.floor(splitIdx * 0.8);
    for (let i = calibStart; i < splitIdx - this.horizon; i++) {
      const features = extractFeatures(this.candles, i, this.inputSize);
      if (features) {
        try {
          const result = await this.model.predict(features);
          calibrationPredictions.push(result.predictions[0]);
          const actualReturn = (this.candles[i + this.horizon].close - this.candles[i].close) / this.candles[i].close;
          calibrationActuals.push(actualReturn);
        } catch (e) {
          // Skip failed predictions
        }
      }
    }

    // Setup conformal predictor from @neural-trader/predictor
    this.conformalPredictor = new AdaptiveConformalPredictor(
      { targetCoverage: 0.9, gamma: 0.02 },
      new AbsoluteScore()
    );

    if (calibrationPredictions.length > 10) {
      await this.conformalPredictor.calibrate(calibrationPredictions, calibrationActuals);
      const stats = this.conformalPredictor.getStats();
      console.log(`   Conformal calibration: ${calibrationPredictions.length} samples`);
      console.log(`   Quantile: ${(stats.quantile * 100).toFixed(4)}%`);
    }

    this.trained = true;
    return this;
  }

  async getSignal(windowCandles) {
    if (!this.trained || windowCandles.length < this.inputSize + 5) {
      return { signal: 'HOLD', confidence: 0, reasons: ['Not ready'] };
    }

    const features = extractFeatures(windowCandles, windowCandles.length - 1, this.inputSize);
    if (!features) {
      return { signal: 'HOLD', confidence: 0, reasons: ['No features'] };
    }

    try {
      // Get neural model prediction with built-in confidence intervals
      const result = await this.model.predict(features);
      const pointPrediction = result.predictions[0];
      const modelLower = result.lowerBound[0];
      const modelUpper = result.upperBound[0];

      // Also get conformal interval for additional confidence
      let conformalInterval = null;
      if (this.conformalPredictor) {
        conformalInterval = this.conformalPredictor.predict(pointPrediction);
      }

      // Use model's own bounds or conformal bounds
      const lower = conformalInterval ? Math.min(modelLower, conformalInterval.lower) : modelLower;
      const upper = conformalInterval ? Math.max(modelUpper, conformalInterval.upper) : modelUpper;

      const threshold = 0.0001; // 0.01% minimum

      // Only trade if entire interval is on one side (high confidence)
      if (lower > threshold) {
        const width = upper - lower;
        const conf = Math.min(lower / (width + 0.0001), 1);
        return {
          signal: 'BUY',
          confidence: conf,
          reasons: [`${this.modelType}: ${(pointPrediction * 100).toFixed(3)}%`, `CI: [${(lower * 100).toFixed(3)}%, ${(upper * 100).toFixed(3)}%]`]
        };
      }

      if (upper < -threshold) {
        const width = upper - lower;
        const conf = Math.min(Math.abs(upper) / (Math.abs(width) + 0.0001), 1);
        return {
          signal: 'SELL',
          confidence: conf,
          reasons: [`${this.modelType}: ${(pointPrediction * 100).toFixed(3)}%`, `CI: [${(lower * 100).toFixed(3)}%, ${(upper * 100).toFixed(3)}%]`]
        };
      }

      return {
        signal: 'HOLD',
        confidence: 0,
        reasons: [`Uncertain: [${(lower * 100).toFixed(3)}%, ${(upper * 100).toFixed(3)}%]`]
      };

    } catch (e) {
      return { signal: 'HOLD', confidence: 0, reasons: [`Error: ${e.message}`] };
    }
  }
}

// Backtest Engine
class BacktestEngine {
  constructor(candles, configObj) {
    this.candles = candles;
    this.initialCapital = configObj.backtesting.initial_capital;
    this.commission = configObj.backtesting.commission;
    this.stopLossPct = configObj.risk.stop_loss_pct;
    this.takeProfitPct = configObj.risk.take_profit_pct;
  }

  async runBacktest(strategy, minConfidence = 0.1) {
    let capital = this.initialCapital;
    let position = null;
    const trades = [];
    const equityCurve = [capital];

    for (let i = 50; i < this.candles.length; i++) {
      const windowCandles = this.candles.slice(0, i + 1);
      const currentCandle = this.candles[i];

      // Get signal (async for neural models)
      const signalResult = await strategy.getSignal(windowCandles);
      const { signal, confidence } = signalResult;

      // Check stop loss / take profit
      if (position) {
        const pnlPct = position.side === 'long'
          ? (currentCandle.close - position.entryPrice) / position.entryPrice
          : (position.entryPrice - currentCandle.close) / position.entryPrice;

        if (pnlPct <= -this.stopLossPct) {
          const pnl = position.size * pnlPct - position.size * this.commission;
          capital += pnl;
          trades.push({ side: position.side, pnl, reason: 'Stop Loss' });
          position = null;
        } else if (pnlPct >= this.takeProfitPct) {
          const pnl = position.size * pnlPct - position.size * this.commission;
          capital += pnl;
          trades.push({ side: position.side, pnl, reason: 'Take Profit' });
          position = null;
        }
      }

      // Process signal
      if (!position && signal !== 'HOLD' && confidence > minConfidence) {
        const size = capital * 0.95;
        position = {
          side: signal === 'BUY' ? 'long' : 'short',
          entryPrice: currentCandle.close,
          size: size - size * this.commission
        };
      } else if (position) {
        if ((position.side === 'long' && signal === 'SELL') ||
            (position.side === 'short' && signal === 'BUY')) {
          const pnlPct = position.side === 'long'
            ? (currentCandle.close - position.entryPrice) / position.entryPrice
            : (position.entryPrice - currentCandle.close) / position.entryPrice;
          const pnl = position.size * pnlPct - position.size * this.commission;
          capital += pnl;
          trades.push({ side: position.side, pnl, reason: 'Signal Reversal' });
          position = null;
        }
      }

      equityCurve.push(capital);

      // Progress indicator
      if (i % 500 === 0) {
        process.stdout.write(`   Testing: ${i}/${this.candles.length} candles\r`);
      }
    }

    // Close open position
    if (position) {
      const lastCandle = this.candles[this.candles.length - 1];
      const pnlPct = position.side === 'long'
        ? (lastCandle.close - position.entryPrice) / position.entryPrice
        : (position.entryPrice - lastCandle.close) / position.entryPrice;
      const pnl = position.size * pnlPct - position.size * this.commission;
      capital += pnl;
      trades.push({ side: position.side, pnl, reason: 'End of Test' });
    }

    // Calculate metrics using @neural-trader/core
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

function printResults(name, results) {
  const { metrics, trades, initialCapital, finalCapital } = results;
  const totalReturn = (finalCapital - initialCapital) / initialCapital;

  console.log(`\n📊 ${name}`);
  console.log('─'.repeat(45));
  console.log(`   Trades: ${trades.length}`);
  console.log(`   Return: ${(totalReturn * 100).toFixed(2)}%`);
  console.log(`   Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
  console.log(`   Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
  console.log(`   Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`   Sharpe: ${metrics.sharpeRatio.toFixed(2)}`);
  console.log(`   Sortino: ${metrics.sortinoRatio.toFixed(2)}`);
}

// Main
async function main() {
  console.log('═'.repeat(60));
  console.log('📊 NEURAL TRADING BACKTEST');
  console.log('   Using: @neural-trader/core NeuralModel');
  console.log('   Models: NHITS, LSTMAttention, Transformer');
  console.log('═'.repeat(60));

  try {
    const candles = await fetchData(12000);

    const splitIdx = Math.floor(candles.length * 0.7);
    const testCandles = candles.slice(splitIdx - 50);

    console.log(`\nTest period: ${testCandles.length} candles`);

    const modelTypes = ['nhits', 'lstm_attention', 'transformer'];
    const results = [];

    for (const modelType of modelTypes) {
      console.log('\n' + '─'.repeat(60));
      const strategy = new NeuralStrategy(modelType, candles, 20, 5);
      await strategy.train(0.7);

      const engine = new BacktestEngine(testCandles, config);
      const result = await engine.runBacktest(strategy, 0.1);
      results.push({ name: modelType.toUpperCase(), ...result });

      printResults(modelType.toUpperCase(), result);
    }

    // Buy & Hold comparison
    const startPrice = testCandles[0].close;
    const endPrice = testCandles[testCandles.length - 1].close;
    const buyHoldReturn = (endPrice - startPrice) / startPrice;
    console.log(`\n📊 Buy & Hold Return: ${(buyHoldReturn * 100).toFixed(2)}%`);

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log('Model           | Return  | Win Rate | Profit Factor');
    console.log('─'.repeat(60));
    for (const r of results) {
      const ret = ((r.finalCapital - r.initialCapital) / r.initialCapital * 100).toFixed(2);
      const wr = (r.metrics.winRate * 100).toFixed(1);
      const pf = r.metrics.profitFactor.toFixed(2);
      console.log(`${r.name.padEnd(15)} | ${ret.padStart(6)}% | ${wr.padStart(7)}% | ${pf.padStart(12)}`);
    }
    console.log(`${'Buy & Hold'.padEnd(15)} | ${(buyHoldReturn * 100).toFixed(2).padStart(6)}% |       - |            -`);

    console.log('\n✅ Backtest Complete');
    console.log('   Packages used:');
    console.log('   - @neural-trader/core (NeuralModel, calculateRsi, calculateSma)');
    console.log('   - @neural-trader/predictor (AdaptiveConformalPredictor)');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

main().catch(console.error);
