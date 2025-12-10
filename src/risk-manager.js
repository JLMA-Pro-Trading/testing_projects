/**
 * Risk Manager Module
 * Manages position sizing, stop losses, take profits, and drawdown limits
 */

const fs = require('fs');
const path = require('path');

class RiskManager {
  /**
   * Initialize risk manager with configuration
   * @param {Object} config - Risk configuration object
   */
  constructor(config) {
    if (!config || !config.risk) {
      throw new Error('Risk configuration is required');
    }

    this.config = config.risk;
    this.maxPositionSize = this.config.max_position_size || 0.1;
    this.maxPortfolioRisk = this.config.max_portfolio_risk || 0.02;
    this.stopLossPct = this.config.stop_loss_pct || 0.02;
    this.takeProfitPct = this.config.take_profit_pct || 0.04;
    this.maxDrawdown = this.config.max_drawdown || 0.10;
    this.leverage = this.config.leverage || 1;

    console.log('Risk Manager initialized with parameters:', {
      maxPositionSize: this.maxPositionSize,
      maxPortfolioRisk: this.maxPortfolioRisk,
      stopLossPct: this.stopLossPct,
      takeProfitPct: this.takeProfitPct,
      maxDrawdown: this.maxDrawdown,
      leverage: this.leverage
    });
  }

  /**
   * Validate if a trade should be allowed based on risk parameters
   * @param {Object} signal - Trading signal {side: 'LONG'|'SHORT', strength: number}
   * @param {Object} currentPosition - Current position {size: number, side: string, entryPrice: number}
   * @param {number} equity - Current account equity
   * @param {number} currentPrice - Current market price
   * @returns {Object} - {allowed: boolean, reason: string, adjustedSize: number}
   */
  validateTrade(signal, currentPosition, equity, currentPrice) {
    // Check if we have a signal
    if (!signal || !signal.side) {
      return {
        allowed: false,
        reason: 'No valid signal provided',
        adjustedSize: 0
      };
    }

    // Check if price is valid
    if (!currentPrice || currentPrice <= 0) {
      return {
        allowed: false,
        reason: 'Invalid current price',
        adjustedSize: 0
      };
    }

    // Check if equity is valid
    if (!equity || equity <= 0) {
      return {
        allowed: false,
        reason: 'Invalid or insufficient equity',
        adjustedSize: 0
      };
    }

    // Calculate safe position size
    const positionSize = this.calculatePositionSize(equity, currentPrice);

    // Check if we already have a position in the same direction
    if (currentPosition && currentPosition.size > 0) {
      if (currentPosition.side === signal.side) {
        return {
          allowed: false,
          reason: `Already have ${signal.side} position`,
          adjustedSize: 0
        };
      }
    }

    // Position size check
    const maxAllowedValue = equity * this.maxPositionSize;
    const positionValue = positionSize * currentPrice;

    if (positionValue > maxAllowedValue) {
      return {
        allowed: false,
        reason: `Position size ${positionValue.toFixed(2)} exceeds max allowed ${maxAllowedValue.toFixed(2)}`,
        adjustedSize: maxAllowedValue / currentPrice
      };
    }

    return {
      allowed: true,
      reason: 'Trade passes all risk checks',
      adjustedSize: positionSize
    };
  }

  /**
   * Calculate safe position size based on equity and risk parameters
   * @param {number} equity - Current account equity
   * @param {number} currentPrice - Current market price
   * @returns {number} - Position size in base currency units
   */
  calculatePositionSize(equity, currentPrice) {
    if (!equity || equity <= 0 || !currentPrice || currentPrice <= 0) {
      return 0;
    }

    // Maximum capital to risk on this trade
    const maxCapital = equity * this.maxPositionSize;

    // Calculate position size in base currency
    const positionSize = maxCapital / currentPrice;

    // Apply leverage if configured
    const leveragedSize = positionSize * this.leverage;

    return leveragedSize;
  }

  /**
   * Check if stop loss should be triggered
   * @param {Object} position - Position object {side: 'LONG'|'SHORT', entryPrice: number, size: number}
   * @param {number} currentPrice - Current market price
   * @returns {boolean} - True if stop loss triggered
   */
  checkStopLoss(position, currentPrice) {
    if (!position || !position.entryPrice || !position.side || !currentPrice) {
      return false;
    }

    const stopLossPrice = this.getStopLossPrice(position.entryPrice, position.side);

    if (position.side === 'LONG') {
      // For LONG: trigger if price falls below stop loss
      return currentPrice <= stopLossPrice;
    } else if (position.side === 'SHORT') {
      // For SHORT: trigger if price rises above stop loss
      return currentPrice >= stopLossPrice;
    }

    return false;
  }

  /**
   * Check if take profit should be triggered
   * @param {Object} position - Position object {side: 'LONG'|'SHORT', entryPrice: number, size: number}
   * @param {number} currentPrice - Current market price
   * @returns {boolean} - True if take profit triggered
   */
  checkTakeProfit(position, currentPrice) {
    if (!position || !position.entryPrice || !position.side || !currentPrice) {
      return false;
    }

    const takeProfitPrice = this.getTakeProfitPrice(position.entryPrice, position.side);

    if (position.side === 'LONG') {
      // For LONG: trigger if price rises above take profit
      return currentPrice >= takeProfitPrice;
    } else if (position.side === 'SHORT') {
      // For SHORT: trigger if price falls below take profit
      return currentPrice <= takeProfitPrice;
    }

    return false;
  }

  /**
   * Check if maximum drawdown has been exceeded
   * @param {number} currentEquity - Current account equity
   * @param {number} peakEquity - Peak account equity (all-time high)
   * @returns {boolean} - True if max drawdown exceeded
   */
  checkMaxDrawdown(currentEquity, peakEquity) {
    if (!currentEquity || !peakEquity || peakEquity <= 0) {
      return false;
    }

    const drawdown = (peakEquity - currentEquity) / peakEquity;

    if (drawdown >= this.maxDrawdown) {
      console.warn(`Max drawdown exceeded: ${(drawdown * 100).toFixed(2)}% >= ${(this.maxDrawdown * 100).toFixed(2)}%`);
      return true;
    }

    return false;
  }

  /**
   * Calculate stop loss price for a position
   * @param {number} entryPrice - Entry price of position
   * @param {string} side - Position side ('LONG' or 'SHORT')
   * @returns {number} - Stop loss price
   */
  getStopLossPrice(entryPrice, side) {
    if (!entryPrice || entryPrice <= 0) {
      return 0;
    }

    if (side === 'LONG') {
      // For LONG: stop loss below entry
      return entryPrice * (1 - this.stopLossPct);
    } else if (side === 'SHORT') {
      // For SHORT: stop loss above entry
      return entryPrice * (1 + this.stopLossPct);
    }

    return entryPrice;
  }

  /**
   * Calculate take profit price for a position
   * @param {number} entryPrice - Entry price of position
   * @param {string} side - Position side ('LONG' or 'SHORT')
   * @returns {number} - Take profit price
   */
  getTakeProfitPrice(entryPrice, side) {
    if (!entryPrice || entryPrice <= 0) {
      return 0;
    }

    if (side === 'LONG') {
      // For LONG: take profit above entry
      return entryPrice * (1 + this.takeProfitPct);
    } else if (side === 'SHORT') {
      // For SHORT: take profit below entry
      return entryPrice * (1 - this.takeProfitPct);
    }

    return entryPrice;
  }

  /**
   * Check if emergency exit conditions are met
   * @param {Object} metrics - Trading metrics
   * @param {number} metrics.currentEquity - Current equity
   * @param {number} metrics.peakEquity - Peak equity
   * @param {number} metrics.consecutiveLosses - Number of consecutive losses
   * @param {number} metrics.volatility - Current market volatility
   * @param {number} metrics.unrealizedPnL - Unrealized P&L percentage
   * @returns {boolean} - True if emergency exit required
   */
  shouldEmergencyExit(metrics) {
    if (!metrics) {
      return false;
    }

    const reasons = [];

    // Check for maximum drawdown breach
    if (metrics.currentEquity && metrics.peakEquity) {
      if (this.checkMaxDrawdown(metrics.currentEquity, metrics.peakEquity)) {
        reasons.push('Max drawdown exceeded');
      }
    }

    // Check for excessive consecutive losses
    if (metrics.consecutiveLosses && metrics.consecutiveLosses >= 5) {
      reasons.push(`Excessive consecutive losses: ${metrics.consecutiveLosses}`);
    }

    // Check for extreme volatility (if provided)
    if (metrics.volatility && metrics.volatility > 0.1) {
      reasons.push(`Extreme volatility: ${(metrics.volatility * 100).toFixed(2)}%`);
    }

    // Check for large unrealized loss
    if (metrics.unrealizedPnL && metrics.unrealizedPnL < -this.stopLossPct * 1.5) {
      reasons.push(`Large unrealized loss: ${(metrics.unrealizedPnL * 100).toFixed(2)}%`);
    }

    // Check if equity is critically low
    if (metrics.currentEquity && metrics.initialEquity) {
      const equityRatio = metrics.currentEquity / metrics.initialEquity;
      if (equityRatio < 0.5) {
        reasons.push(`Critical equity loss: ${((1 - equityRatio) * 100).toFixed(2)}%`);
      }
    }

    if (reasons.length > 0) {
      console.error('EMERGENCY EXIT TRIGGERED:', reasons.join(', '));
      return true;
    }

    return false;
  }

  /**
   * Calculate current position P&L
   * @param {Object} position - Position object
   * @param {number} currentPrice - Current market price
   * @returns {Object} - {pnl: number, pnlPct: number}
   */
  calculatePositionPnL(position, currentPrice) {
    if (!position || !position.entryPrice || !position.size || !currentPrice) {
      return { pnl: 0, pnlPct: 0 };
    }

    let pnl = 0;

    if (position.side === 'LONG') {
      pnl = (currentPrice - position.entryPrice) * position.size;
    } else if (position.side === 'SHORT') {
      pnl = (position.entryPrice - currentPrice) * position.size;
    }

    const pnlPct = pnl / (position.entryPrice * position.size);

    return { pnl, pnlPct };
  }

  /**
   * Get risk summary
   * @returns {Object} - Risk parameters summary
   */
  getRiskSummary() {
    return {
      maxPositionSize: this.maxPositionSize,
      maxPortfolioRisk: this.maxPortfolioRisk,
      stopLossPct: this.stopLossPct,
      takeProfitPct: this.takeProfitPct,
      maxDrawdown: this.maxDrawdown,
      leverage: this.leverage
    };
  }
}

module.exports = RiskManager;
