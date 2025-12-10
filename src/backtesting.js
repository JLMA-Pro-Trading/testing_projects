/**
 * Backtesting Module for Neural Trader
 *
 * Features:
 * - Walk-forward validation
 * - Simulated trading with full P&L tracking
 * - Performance metrics (Sharpe, Sortino, Max DD, Win Rate)
 * - Multi-strategy comparison
 */

// ============================================================================
// TRADE EXECUTOR
// ============================================================================

class TradeExecutor {
  constructor(initialCapital, commission = 0.0004, slippage = 0.0001) {
    this.initialCapital = initialCapital;
    this.commission = commission;
    this.slippage = slippage;
    this.reset();
  }

  reset() {
    this.equity = this.initialCapital;
    this.trades = [];
    this.equityCurve = [{ timestamp: null, equity: this.initialCapital }];
    this.currentPosition = null;
    this.totalCommissions = 0;
  }

  executeOrder(signal, price, timestamp, positionSize) {
    // Allow fractional shares for crypto trading
    const shares = positionSize / price;
    if (shares <= 0) return null;

    // Apply slippage to execution price
    const slippageFactor = signal === 'BUY' ? (1 + this.slippage) : (1 - this.slippage);
    const executionPrice = price * slippageFactor;

    const commissionFee = executionPrice * shares * this.commission;

    // Close existing position if signal direction changes
    if (this.currentPosition && this.currentPosition.type !== signal) {
      this.closePosition(price, timestamp);
    }

    if (signal === 'BUY' && !this.currentPosition) {
      this.currentPosition = {
        type: 'LONG',
        entryPrice: executionPrice,
        entryTime: timestamp,
        shares: shares,
        entryCommission: commissionFee
      };
      return { type: 'BUY', shares, price: executionPrice, commission: commissionFee };
    }

    if (signal === 'SELL' && !this.currentPosition) {
      this.currentPosition = {
        type: 'SHORT',
        entryPrice: executionPrice,
        entryTime: timestamp,
        shares: shares,
        entryCommission: commissionFee
      };
      return { type: 'SELL', shares, price: executionPrice, commission: commissionFee };
    }

    return null;
  }

  closePosition(price, timestamp) {
    if (!this.currentPosition) return null;

    const { entryPrice, entryTime, shares, type, entryCommission } = this.currentPosition;

    // Apply slippage to exit price (opposite direction of entry)
    const slippageFactor = type === 'LONG' ? (1 - this.slippage) : (1 + this.slippage);
    const exitPrice = price * slippageFactor;

    const exitCommission = exitPrice * shares * this.commission;
    const totalCommissions = entryCommission + exitCommission;

    let pnl, pnlPct;
    if (type === 'LONG') {
      pnl = (exitPrice - entryPrice) * shares - totalCommissions;
      pnlPct = (exitPrice - entryPrice) / entryPrice - (totalCommissions / (entryPrice * shares));
    } else {
      pnl = (entryPrice - exitPrice) * shares - totalCommissions;
      pnlPct = (entryPrice - exitPrice) / entryPrice - (totalCommissions / (entryPrice * shares));
    }

    this.equity += pnl;
    this.totalCommissions += totalCommissions;

    const trade = {
      entryPrice, entryTime, exitPrice, exitTime: timestamp,
      shares, type, pnl, pnlPct, commission: totalCommissions
    };

    this.trades.push(trade);
    this.currentPosition = null;
    return trade;
  }

  updateEquityCurve(price, timestamp) {
    let currentEquity = this.equity;

    if (this.currentPosition) {
      const { entryPrice, shares, type } = this.currentPosition;
      const unrealizedPnl = type === 'LONG'
        ? (price - entryPrice) * shares
        : (entryPrice - price) * shares;
      currentEquity = this.equity + unrealizedPnl;
    }

    this.equityCurve.push({ timestamp, equity: currentEquity });
    return currentEquity;
  }

  getStats() {
    const trades = this.trades;
    if (trades.length === 0) {
      return {
        totalTrades: 0, winRate: 0, grossProfit: 0, grossLoss: 0,
        profitFactor: 0, avgWin: 0, avgLoss: 0, returnsPct: 0
      };
    }

    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl < 0);
    const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));

    return {
      totalTrades: trades.length,
      winningTrades: winners.length,
      losingTrades: losers.length,
      winRate: winners.length / trades.length,
      grossProfit,
      grossLoss,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      avgWin: winners.length > 0 ? grossProfit / winners.length : 0,
      avgLoss: losers.length > 0 ? -grossLoss / losers.length : 0,
      returnsPct: (this.equity - this.initialCapital) / this.initialCapital
    };
  }
}

// ============================================================================
// METRICS CALCULATOR
// ============================================================================

/**
 * Calculate periods per year based on trading interval
 * @param {string} interval - Trading interval (e.g., '1m', '1h', '4h', '1d')
 * @returns {number} Number of periods per year
 */
function calculatePeriodsPerYear(interval) {
  const intervalMap = {
    '1m': 525600,  // 365 * 24 * 60
    '5m': 105120,  // 365 * 24 * 12
    '15m': 35040,  // 365 * 24 * 4
    '1h': 8760,    // 365 * 24
    '4h': 2190,    // 365 * 6
    '1d': 365      // 365
  };
  return intervalMap[interval] || 525600; // Default to 1-minute
}

class MetricsCalculator {
  static calculateSharpeRatio(equityCurve, riskFreeRate = 0.02, periodsPerYear = 525600) {
    if (equityCurve.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const ret = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      returns.push(ret);
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const annualFactor = Math.sqrt(periodsPerYear);
    return stdDev > 0 ? ((mean * periodsPerYear) - riskFreeRate) / (stdDev * annualFactor) : 0;
  }

  static calculateMaxDrawdown(equityCurve) {
    if (equityCurve.length < 2) return 0;

    let maxDrawdown = 0;
    let peak = equityCurve[0].equity;

    for (const point of equityCurve) {
      if (point.equity > peak) peak = point.equity;
      const drawdown = (peak - point.equity) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return maxDrawdown;
  }

  static calculateSortinoRatio(equityCurve, riskFreeRate = 0.02, periodsPerYear = 525600) {
    if (equityCurve.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const ret = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      returns.push(ret);
    }

    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const downsideReturns = returns.filter(r => r < 0);
    if (downsideReturns.length === 0) return 0;

    const downVariance = downsideReturns.reduce((sum, r) => sum + r * r, 0) / returns.length;
    const downStdDev = Math.sqrt(downVariance);

    const annualFactor = Math.sqrt(periodsPerYear);
    return downStdDev > 0 ? ((mean * periodsPerYear) - riskFreeRate) / (downStdDev * annualFactor) : 0;
  }

  static generateSummary(executor, tradeDuration, periodsPerYear = 525600) {
    const stats = executor.getStats();
    const maxDrawdown = this.calculateMaxDrawdown(executor.equityCurve);
    const sharpeRatio = this.calculateSharpeRatio(executor.equityCurve, 0.02, periodsPerYear);
    const sortinoRatio = this.calculateSortinoRatio(executor.equityCurve, 0.02, periodsPerYear);

    return {
      ...stats,
      maxDrawdown,
      sharpeRatio,
      sortinoRatio,
      calmarRatio: maxDrawdown > 0 ? stats.returnsPct / maxDrawdown : 0
    };
  }
}

// ============================================================================
// BACKTEST ENGINE
// ============================================================================

class BacktestEngine {
  constructor(candles, config) {
    this.candles = candles;
    this.config = config;
  }

  runBacktest(strategyFn) {
    if (this.candles.length < 100) {
      return { error: 'Insufficient data', trades: [], metrics: {} };
    }

    const initialCapital = this.config.backtesting?.initial_capital || 10000;
    const positionSizePct = this.config.risk?.max_position_size || 0.1;
    const commission = this.config.backtesting?.commission || 0.0004;
    const slippage = this.config.backtesting?.slippage || 0.0001;
    const executor = new TradeExecutor(initialCapital, commission, slippage);

    // Calculate periods per year from interval
    const interval = this.config.trading?.interval || '1m';
    const periodsPerYear = calculatePeriodsPerYear(interval);

    // Make warmup period configurable
    const warmupPeriod = this.config.trading?.parameters?.window_size || 50;

    const startTime = this.candles[0].timestamp;
    const endTime = this.candles[this.candles.length - 1].timestamp;

    for (let i = warmupPeriod; i < this.candles.length; i++) {
      const currentCandles = this.candles.slice(0, i + 1);
      const signal = strategyFn(currentCandles);

      const price = this.candles[i].close;
      const timestamp = this.candles[i].timestamp;

      if (signal && signal.signal !== 'HOLD') {
        // Dynamic position sizing based on current equity
        const positionSize = executor.equity * positionSizePct;
        executor.executeOrder(signal.signal, price, timestamp, positionSize);
      }

      executor.updateEquityCurve(price, timestamp);
    }

    // Close any open position
    if (executor.currentPosition) {
      const lastPrice = this.candles[this.candles.length - 1].close;
      executor.closePosition(lastPrice, endTime);
      executor.updateEquityCurve(lastPrice, endTime);
    }

    const metrics = MetricsCalculator.generateSummary(executor, endTime - startTime, periodsPerYear);

    return {
      success: true,
      startDate: new Date(startTime),
      endDate: new Date(endTime),
      initialCapital,
      finalCapital: executor.equity,
      trades: executor.trades,
      equityCurve: executor.equityCurve,
      metrics
    };
  }

  walkForwardValidation(strategyFn, trainFn, numSplits = 5) {
    const totalCandles = this.candles.length;
    const candlesPerSplit = Math.floor(totalCandles / (numSplits + 1));
    const results = [];

    for (let split = 0; split < numSplits; split++) {
      const trainEnd = (split + 1) * candlesPerSplit;
      const testStart = trainEnd;
      const testEnd = Math.min((split + 2) * candlesPerSplit, totalCandles);

      if (testEnd - testStart < 100) break;

      const trainCandles = this.candles.slice(0, trainEnd);
      const testCandles = this.candles.slice(testStart, testEnd);

      // Train model
      const model = trainFn(trainCandles);

      // Create strategy with trained model
      const testEngine = new BacktestEngine(testCandles, this.config);
      const backtest = testEngine.runBacktest((candles) => strategyFn(candles, model));

      results.push({
        split: split + 1,
        trainSize: trainCandles.length,
        testSize: testCandles.length,
        ...backtest
      });
    }

    // Aggregate results
    const summary = {
      avgReturn: results.reduce((s, r) => s + (r.metrics?.returnsPct || 0), 0) / results.length,
      avgSharpe: results.reduce((s, r) => s + (r.metrics?.sharpeRatio || 0), 0) / results.length,
      avgWinRate: results.reduce((s, r) => s + (r.metrics?.winRate || 0), 0) / results.length,
      avgMaxDD: results.reduce((s, r) => s + (r.metrics?.maxDrawdown || 0), 0) / results.length,
      totalTrades: results.reduce((s, r) => s + (r.metrics?.totalTrades || 0), 0)
    };

    return { splits: results, summary };
  }

  compareStrategies(strategiesMap) {
    const results = {};

    for (const [name, strategyFn] of Object.entries(strategiesMap)) {
      results[name] = this.runBacktest(strategyFn);
    }

    const ranked = Object.entries(results)
      .map(([name, result]) => ({
        name,
        ...result,
        score: this.calculateScore(result.metrics)
      }))
      .sort((a, b) => b.score - a.score);

    return { results, ranked };
  }

  calculateScore(metrics) {
    if (!metrics || metrics.totalTrades === 0) return -Infinity;
    const returnScore = Math.max(metrics.returnsPct, -1) * 100;
    const sharpeScore = metrics.sharpeRatio * 10;
    const winRateScore = metrics.winRate * 100;
    const ddPenalty = -metrics.maxDrawdown * 100;
    return (returnScore * 0.4) + (sharpeScore * 0.3) + (winRateScore * 0.2) + (ddPenalty * 0.1);
  }
}

module.exports = { BacktestEngine, TradeExecutor, MetricsCalculator };
