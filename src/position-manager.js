/**
 * PositionManager - Manages open trading positions
 * Tracks positions and calculates unrealized P&L
 */
class PositionManager {
  constructor(commissionRate = 0.0004) {
    this.position = null; // Current open position
    this.commissionRate = commissionRate; // 0.04% = 0.0004
  }

  /**
   * Open a new position
   * @param {string} symbol - Trading pair symbol (e.g., 'BTCUSDT')
   * @param {string} side - 'LONG' or 'SHORT'
   * @param {number} entryPrice - Entry price
   * @param {number} quantity - Position size (can be fractional)
   * @param {number} timestamp - Entry timestamp
   * @returns {object} The opened position
   */
  openPosition(symbol, side, entryPrice, quantity, timestamp = Date.now()) {
    if (this.position) {
      throw new Error(`Cannot open new position: already have open ${this.position.side} position on ${this.position.symbol}`);
    }

    if (!['LONG', 'SHORT'].includes(side)) {
      throw new Error(`Invalid side: ${side}. Must be 'LONG' or 'SHORT'`);
    }

    if (entryPrice <= 0 || quantity <= 0) {
      throw new Error('Entry price and quantity must be positive');
    }

    this.position = {
      symbol,
      side,
      entryPrice,
      quantity,
      timestamp,
      entryValue: entryPrice * quantity,
      entryCommission: entryPrice * quantity * this.commissionRate
    };

    return { ...this.position };
  }

  /**
   * Close the current position
   * @param {number} exitPrice - Exit price
   * @param {number} timestamp - Exit timestamp
   * @returns {object} Trade result with P&L details
   */
  closePosition(exitPrice, timestamp = Date.now()) {
    if (!this.position) {
      throw new Error('No open position to close');
    }

    if (exitPrice <= 0) {
      throw new Error('Exit price must be positive');
    }

    const { symbol, side, entryPrice, quantity, timestamp: entryTimestamp, entryCommission } = this.position;

    // Calculate exit value and commission
    const exitValue = exitPrice * quantity;
    const exitCommission = exitValue * this.commissionRate;
    const totalCommission = entryCommission + exitCommission;

    // Calculate P&L based on position side
    let grossPnL;
    if (side === 'LONG') {
      // LONG: profit when price goes up
      grossPnL = (exitPrice - entryPrice) * quantity;
    } else {
      // SHORT: profit when price goes down
      grossPnL = (entryPrice - exitPrice) * quantity;
    }

    const netPnL = grossPnL - totalCommission;
    const returnPct = (netPnL / (entryPrice * quantity)) * 100;

    const tradeResult = {
      symbol,
      side,
      entryPrice,
      exitPrice,
      quantity,
      entryTimestamp,
      exitTimestamp: timestamp,
      duration: timestamp - entryTimestamp,
      grossPnL,
      entryCommission,
      exitCommission,
      totalCommission,
      netPnL,
      returnPct
    };

    // Clear the position
    this.position = null;

    return tradeResult;
  }

  /**
   * Get the current open position
   * @returns {object|null} Current position or null if no position
   */
  getCurrentPosition() {
    return this.position ? { ...this.position } : null;
  }

  /**
   * Calculate unrealized P&L for current position
   * @param {number} currentPrice - Current market price
   * @returns {object|null} Unrealized P&L details or null if no position
   */
  getUnrealizedPnL(currentPrice) {
    if (!this.position) {
      return null;
    }

    if (currentPrice <= 0) {
      throw new Error('Current price must be positive');
    }

    const { side, entryPrice, quantity, entryCommission } = this.position;

    // Calculate potential exit value and commission
    const exitValue = currentPrice * quantity;
    const exitCommission = exitValue * this.commissionRate;
    const totalCommission = entryCommission + exitCommission;

    // Calculate unrealized P&L based on position side
    let grossPnL;
    if (side === 'LONG') {
      grossPnL = (currentPrice - entryPrice) * quantity;
    } else {
      grossPnL = (entryPrice - currentPrice) * quantity;
    }

    const netPnL = grossPnL - totalCommission;
    const returnPct = (netPnL / (entryPrice * quantity)) * 100;

    return {
      currentPrice,
      grossPnL,
      totalCommission,
      netPnL,
      returnPct
    };
  }

  /**
   * Check if there is an open position
   * @returns {boolean} True if position exists
   */
  hasPosition() {
    return this.position !== null;
  }

  /**
   * Get position side if open
   * @returns {string|null} 'LONG', 'SHORT', or null
   */
  getPositionSide() {
    return this.position ? this.position.side : null;
  }

  /**
   * Reset the position manager (for testing)
   */
  reset() {
    this.position = null;
  }
}

module.exports = PositionManager;
