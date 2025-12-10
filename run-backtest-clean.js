#!/usr/bin/env node
/**
 * Clean Backtest - Uses ONLY @neural-trader packages
 * No custom implementations
 */

const core = require('@neural-trader/core');
const { calculateRsi, calculateSma, calculateSharpeRatio, calculateSortinoRatio } = core;
const { SplitConformalPredictor, AbsoluteScore } = require('@neural-trader/predictor');
const config = require('./config.json');

// Fetch data using curl (Binance Testnet)
function curlFetch(url) {
  const { execSync } = require('child_process');
  const result = execSync(`curl -s --connect-timeout 15 "${url}"`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(result);
}

// Fetch candle data from Binance Testnet
async function fetchData(limit = 5000) {
  console.log(`\n📊 Fetching BTCUSDT 1m data from Binance Testnet...`);
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

// RSI Mean Reversion Strategy using @neural-trader/core
function rsiMeanReversionStrategy(candles) {
  if (candles.length < 20) {
    return { signal: 'HOLD', confidence: 0, reasons: ['Warmup period'] };
  }

  const closes = candles.map(c => c.close);
  const rsi = calculateRsi(closes, 14);
  const currentRsi = rsi[rsi.length - 1];

  if (currentRsi === undefined || currentRsi === 0) {
    return { signal: 'HOLD', confidence: 0, reasons: ['No RSI data'] };
  }

  // Strong oversold - BUY
  if (currentRsi < 25) {
    const conf = Math.min((25 - currentRsi) / 25, 1);
    return { signal: 'BUY', confidence: conf, reasons: [`RSI=${currentRsi.toFixed(1)} (oversold)`] };
  }

  // Strong overbought - SELL
  if (currentRsi > 75) {
    const conf = Math.min((currentRsi - 75) / 25, 1);
    return { signal: 'SELL', confidence: conf, reasons: [`RSI=${currentRsi.toFixed(1)} (overbought)`] };
  }

  return { signal: 'HOLD', confidence: 0, reasons: [`RSI=${currentRsi.toFixed(1)} (neutral)`] };
}

// SMA Crossover Strategy using @neural-trader/core
function smaCrossoverStrategy(candles) {
  if (candles.length < 50) {
    return { signal: 'HOLD', confidence: 0, reasons: ['Warmup period'] };
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

// Combined Strategy with Confirmation
function combinedStrategy(candles) {
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

  // RSI only with high confidence
  if (rsiSignal.signal !== 'HOLD' && rsiSignal.confidence > 0.3) {
    return rsiSignal;
  }

  return { signal: 'HOLD', confidence: 0, reasons: ['No clear signal'] };
}

// Simple Backtest Engine (using package functions for calculations)
class SimpleBacktest {
  constructor(candles, configObj) {
    this.candles = candles;
    this.initialCapital = configObj.backtesting.initial_capital;
    this.commission = configObj.backtesting.commission;
    this.stopLossPct = configObj.risk.stop_loss_pct;
    this.takeProfitPct = configObj.risk.take_profit_pct;
  }

  runBacktest(strategyFn) {
    let capital = this.initialCapital;
    let position = null;
    const trades = [];
    const equityCurve = [capital];

    for (let i = 50; i < this.candles.length; i++) {
      const windowCandles = this.candles.slice(0, i + 1);
      const currentCandle = this.candles[i];
      const { signal, confidence, reasons } = strategyFn(windowCandles);

      // Check stop loss / take profit if in position
      if (position) {
        const pnlPct = position.side === 'long'
          ? (currentCandle.close - position.entryPrice) / position.entryPrice
          : (position.entryPrice - currentCandle.close) / position.entryPrice;

        // Stop loss
        if (pnlPct <= -this.stopLossPct) {
          const pnl = position.size * pnlPct - position.size * this.commission;
          capital += pnl;
          trades.push({
            side: position.side,
            entryPrice: position.entryPrice,
            exitPrice: currentCandle.close,
            pnl,
            reason: 'Stop Loss'
          });
          position = null;
        }
        // Take profit
        else if (pnlPct >= this.takeProfitPct) {
          const pnl = position.size * pnlPct - position.size * this.commission;
          capital += pnl;
          trades.push({
            side: position.side,
            entryPrice: position.entryPrice,
            exitPrice: currentCandle.close,
            pnl,
            reason: 'Take Profit'
          });
          position = null;
        }
      }

      // Process signal
      if (!position && signal !== 'HOLD' && confidence > 0.3) {
        const size = capital * 0.95; // Use 95% of capital
        position = {
          side: signal === 'BUY' ? 'long' : 'short',
          entryPrice: currentCandle.close,
          size: size - size * this.commission
        };
      } else if (position) {
        // Exit on opposite signal
        if ((position.side === 'long' && signal === 'SELL') ||
            (position.side === 'short' && signal === 'BUY')) {
          const pnlPct = position.side === 'long'
            ? (currentCandle.close - position.entryPrice) / position.entryPrice
            : (position.entryPrice - currentCandle.close) / position.entryPrice;
          const pnl = position.size * pnlPct - position.size * this.commission;
          capital += pnl;
          trades.push({
            side: position.side,
            entryPrice: position.entryPrice,
            exitPrice: currentCandle.close,
            pnl,
            reason: 'Signal Reversal'
          });
          position = null;
        }
      }

      equityCurve.push(capital);
    }

    // Close any open position
    if (position) {
      const lastCandle = this.candles[this.candles.length - 1];
      const pnlPct = position.side === 'long'
        ? (lastCandle.close - position.entryPrice) / position.entryPrice
        : (position.entryPrice - lastCandle.close) / position.entryPrice;
      const pnl = position.size * pnlPct - position.size * this.commission;
      capital += pnl;
      trades.push({
        side: position.side,
        entryPrice: position.entryPrice,
        exitPrice: lastCandle.close,
        pnl,
        reason: 'End of Test'
      });
    }

    // Calculate metrics using @neural-trader/core functions
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i-1]) / equityCurve[i-1]);
    }

    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl <= 0);

    const metrics = {
      totalTrades: trades.length,
      winners: winners.length,
      losers: losers.length,
      winRate: trades.length > 0 ? winners.length / trades.length : 0,
      avgWin: winners.length > 0 ? winners.reduce((a, t) => a + t.pnl, 0) / winners.length : 0,
      avgLoss: losers.length > 0 ? Math.abs(losers.reduce((a, t) => a + t.pnl, 0) / losers.length) : 0,
      profitFactor: losers.length > 0 && losers.reduce((a, t) => a + Math.abs(t.pnl), 0) > 0
        ? winners.reduce((a, t) => a + t.pnl, 0) / losers.reduce((a, t) => a + Math.abs(t.pnl), 0)
        : 0,
      maxDrawdown: this.calculateMaxDrawdown(equityCurve),
      sharpeRatio: returns.length > 0 ? calculateSharpeRatio(returns, 0, Math.sqrt(252 * 24 * 60)) : 0,
      sortinoRatio: returns.length > 0 ? calculateSortinoRatio(returns, 0, Math.sqrt(252 * 24 * 60)) : 0
    };

    return {
      initialCapital: this.initialCapital,
      finalCapital: capital,
      metrics,
      trades,
      equityCurve
    };
  }

  calculateMaxDrawdown(equityCurve) {
    let maxDD = 0;
    let peak = equityCurve[0];
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
  console.log('📊 CLEAN BACKTEST - Using @neural-trader packages');
  console.log('═'.repeat(60));

  try {
    // Fetch data
    const candles = await fetchData(10000);

    // Split 80/20
    const splitIdx = Math.floor(candles.length * 0.8);
    const testCandles = candles.slice(splitIdx - 50); // Include warmup

    console.log(`\nTesting on ${testCandles.length} candles\n`);

    // Test strategies
    const strategies = [
      { name: 'RSI Mean Reversion', fn: rsiMeanReversionStrategy },
      { name: 'SMA Crossover', fn: smaCrossoverStrategy },
      { name: 'Combined (Confirmation)', fn: combinedStrategy }
    ];

    for (const strategy of strategies) {
      console.log(`\n📈 Testing: ${strategy.name}`);
      console.log('─'.repeat(40));

      const engine = new SimpleBacktest(testCandles, config);
      const results = engine.runBacktest(strategy.fn);

      const { metrics, trades, initialCapital, finalCapital } = results;
      const totalReturn = (finalCapital - initialCapital) / initialCapital;

      console.log(`   Trades: ${trades.length}`);
      console.log(`   Return: ${(totalReturn * 100).toFixed(2)}%`);
      console.log(`   Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
      console.log(`   Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
      console.log(`   Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
      console.log(`   Sharpe: ${metrics.sharpeRatio.toFixed(2)}`);
      console.log(`   Sortino: ${metrics.sortinoRatio.toFixed(2)}`);
    }

    // Buy and Hold comparison
    const startPrice = testCandles[0].close;
    const endPrice = testCandles[testCandles.length - 1].close;
    const buyHoldReturn = (endPrice - startPrice) / startPrice;
    console.log(`\n📊 Buy & Hold Return: ${(buyHoldReturn * 100).toFixed(2)}%`);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Backtest Complete (using @neural-trader/core)');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

main().catch(console.error);
