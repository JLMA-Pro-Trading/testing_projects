/**
 * PnLTracker - Tracks realized P&L and trading performance
 * Maintains trade history and calculates performance metrics
 */
class PnLTracker {
  constructor(initialCapital = 0) {
    this.initialCapital = initialCapital;
    this.trades = []; // Array of completed trades
    this.totalCommissions = 0;
    this.totalRealizedPnL = 0;
  }

  /**
   * Record a completed trade
   * @param {object} trade - Trade object from PositionManager.closePosition()
   * @returns {object} Updated equity and P&L summary
   */
  recordTrade(trade) {
    if (!trade || typeof trade !== 'object') {
      throw new Error('Invalid trade object');
    }

    // Validate required trade fields
    const requiredFields = ['symbol', 'side', 'entryPrice', 'exitPrice', 'quantity', 'netPnL', 'totalCommission'];
    for (const field of requiredFields) {
      if (!(field in trade)) {
        throw new Error(`Trade missing required field: ${field}`);
      }
    }

    // Store the trade
    this.trades.push({
      ...trade,
      tradeNumber: this.trades.length + 1,
      recordedAt: Date.now()
    });

    // Update totals
    this.totalRealizedPnL += trade.netPnL;
    this.totalCommissions += trade.totalCommission;

    return {
      tradeNumber: this.trades.length,
      currentEquity: this.getCurrentEquity(),
      totalPnL: this.totalRealizedPnL,
      totalCommissions: this.totalCommissions
    };
  }

  /**
   * Get current equity (initial capital + realized P&L)
   * @returns {number} Current equity
   */
  getCurrentEquity() {
    return this.initialCapital + this.totalRealizedPnL;
  }

  /**
   * Get total realized P&L
   * @returns {number} Total P&L from all closed trades
   */
  getTotalPnL() {
    return this.totalRealizedPnL;
  }

  /**
   * Get complete trade history
   * @param {number} limit - Optional limit on number of trades returned
   * @returns {array} Array of trade objects
   */
  getTradeHistory(limit = null) {
    if (limit && limit > 0) {
      return this.trades.slice(-limit);
    }
    return [...this.trades];
  }

  /**
   * Calculate win rate
   * @returns {number} Win rate as percentage (0-100)
   */
  getWinRate() {
    if (this.trades.length === 0) {
      return 0;
    }

    const winningTrades = this.trades.filter(trade => trade.netPnL > 0).length;
    return (winningTrades / this.trades.length) * 100;
  }

  /**
   * Get comprehensive trading metrics
   * @returns {object} Performance metrics
   */
  getMetrics() {
    if (this.trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: this.totalRealizedPnL,
        totalCommissions: this.totalCommissions,
        averagePnL: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        profitFactor: 0,
        currentEquity: this.getCurrentEquity(),
        initialCapital: this.initialCapital,
        returnPct: 0,
        longTrades: 0,
        shortTrades: 0
      };
    }

    const winningTrades = this.trades.filter(trade => trade.netPnL > 0);
    const losingTrades = this.trades.filter(trade => trade.netPnL < 0);
    const longTrades = this.trades.filter(trade => trade.side === 'LONG');
    const shortTrades = this.trades.filter(trade => trade.side === 'SHORT');

    const totalWins = winningTrades.reduce((sum, trade) => sum + trade.netPnL, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.netPnL, 0));

    const averagePnL = this.totalRealizedPnL / this.trades.length;
    const averageWin = winningTrades.length > 0
      ? totalWins / winningTrades.length
      : 0;
    const averageLoss = losingTrades.length > 0
      ? totalLosses / losingTrades.length
      : 0;

    const pnls = this.trades.map(trade => trade.netPnL);
    const largestWin = Math.max(...pnls, 0);
    const largestLoss = Math.min(...pnls, 0);

    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? Infinity : 0);

    const currentEquity = this.getCurrentEquity();
    const returnPct = this.initialCapital > 0
      ? ((currentEquity - this.initialCapital) / this.initialCapital) * 100
      : 0;

    return {
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: this.getWinRate(),
      totalPnL: this.totalRealizedPnL,
      totalCommissions: this.totalCommissions,
      averagePnL,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      profitFactor,
      currentEquity,
      initialCapital: this.initialCapital,
      returnPct,
      longTrades: longTrades.length,
      shortTrades: shortTrades.length,
      longWinRate: longTrades.length > 0
        ? (longTrades.filter(t => t.netPnL > 0).length / longTrades.length) * 100
        : 0,
      shortWinRate: shortTrades.length > 0
        ? (shortTrades.filter(t => t.netPnL > 0).length / shortTrades.length) * 100
        : 0
    };
  }

  /**
   * Get equity curve data points
   * @returns {array} Array of {timestamp, equity, trade, pnl} objects
   */
  getEquityCurve() {
    const curve = [{
      timestamp: 0,
      equity: this.initialCapital,
      trade: 0,
      pnl: 0
    }];

    let runningPnL = 0;
    this.trades.forEach((trade, index) => {
      runningPnL += trade.netPnL;
      curve.push({
        timestamp: trade.exitTimestamp || trade.recordedAt,
        equity: this.initialCapital + runningPnL,
        trade: index + 1,
        pnl: trade.netPnL
      });
    });

    return curve;
  }

  /**
   * Get recent trades summary
   * @param {number} count - Number of recent trades to summarize
   * @returns {object} Summary of recent performance
   */
  getRecentPerformance(count = 10) {
    const recentTrades = this.trades.slice(-count);

    if (recentTrades.length === 0) {
      return {
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnL: 0
      };
    }

    const wins = recentTrades.filter(trade => trade.netPnL > 0).length;
    const totalPnL = recentTrades.reduce((sum, trade) => sum + trade.netPnL, 0);

    return {
      trades: recentTrades.length,
      wins,
      losses: recentTrades.length - wins,
      winRate: (wins / recentTrades.length) * 100,
      totalPnL
    };
  }

  /**
   * Reset the tracker (for testing)
   */
  reset() {
    this.trades = [];
    this.totalCommissions = 0;
    this.totalRealizedPnL = 0;
  }

  /**
   * Export data for persistence
   * @returns {object} Serializable state
   */
  exportState() {
    return {
      initialCapital: this.initialCapital,
      trades: this.trades,
      totalCommissions: this.totalCommissions,
      totalRealizedPnL: this.totalRealizedPnL
    };
  }

  /**
   * Import data from persistence
   * @param {object} state - Previously exported state
   */
  importState(state) {
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid state object');
    }

    this.initialCapital = state.initialCapital || 0;
    this.trades = state.trades || [];
    this.totalCommissions = state.totalCommissions || 0;
    this.totalRealizedPnL = state.totalRealizedPnL || 0;
  }
}

module.exports = PnLTracker;
