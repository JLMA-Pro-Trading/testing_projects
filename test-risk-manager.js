/**
 * Test script for Risk Manager
 */

const RiskManager = require('./src/risk-manager');
const config = require('./config.json');

console.log('=== Risk Manager Test ===\n');

// Initialize risk manager
const riskManager = new RiskManager(config);

console.log('\n1. Risk Summary:');
console.log(JSON.stringify(riskManager.getRiskSummary(), null, 2));

// Test parameters
const equity = 10000;
const btcPrice = 43000;

console.log('\n2. Calculate Position Size:');
const positionSize = riskManager.calculatePositionSize(equity, btcPrice);
console.log(`Equity: $${equity}`);
console.log(`BTC Price: $${btcPrice}`);
console.log(`Position Size: ${positionSize.toFixed(6)} BTC`);
console.log(`Position Value: $${(positionSize * btcPrice).toFixed(2)}`);

console.log('\n3. Calculate Stop Loss & Take Profit Prices:');

// LONG position
const longEntry = 43000;
console.log(`\nLONG Position @ $${longEntry}:`);
const longStopLoss = riskManager.getStopLossPrice(longEntry, 'LONG');
const longTakeProfit = riskManager.getTakeProfitPrice(longEntry, 'LONG');
console.log(`  Stop Loss: $${longStopLoss.toFixed(2)} (${((longStopLoss - longEntry) / longEntry * 100).toFixed(2)}%)`);
console.log(`  Take Profit: $${longTakeProfit.toFixed(2)} (+${((longTakeProfit - longEntry) / longEntry * 100).toFixed(2)}%)`);

// SHORT position
const shortEntry = 43000;
console.log(`\nSHORT Position @ $${shortEntry}:`);
const shortStopLoss = riskManager.getStopLossPrice(shortEntry, 'SHORT');
const shortTakeProfit = riskManager.getTakeProfitPrice(shortEntry, 'SHORT');
console.log(`  Stop Loss: $${shortStopLoss.toFixed(2)} (+${((shortStopLoss - shortEntry) / shortEntry * 100).toFixed(2)}%)`);
console.log(`  Take Profit: $${shortTakeProfit.toFixed(2)} (${((shortTakeProfit - shortEntry) / shortEntry * 100).toFixed(2)}%)`);

console.log('\n4. Validate Trade Signal:');
const signal = { side: 'LONG', strength: 0.8 };
const currentPosition = null;
const validation = riskManager.validateTrade(signal, currentPosition, equity, btcPrice);
console.log(`Signal: ${signal.side}`);
console.log(`Allowed: ${validation.allowed}`);
console.log(`Reason: ${validation.reason}`);
console.log(`Adjusted Size: ${validation.adjustedSize.toFixed(6)} BTC`);

console.log('\n5. Check Stop Loss Trigger:');
const longPosition = { side: 'LONG', entryPrice: 43000, size: 0.023 };

// Price above entry (no stop loss)
let currentPrice = 43500;
let stopLossTriggered = riskManager.checkStopLoss(longPosition, currentPrice);
console.log(`Price: $${currentPrice} - Stop Loss Triggered: ${stopLossTriggered}`);

// Price at stop loss
currentPrice = longStopLoss;
stopLossTriggered = riskManager.checkStopLoss(longPosition, currentPrice);
console.log(`Price: $${currentPrice.toFixed(2)} - Stop Loss Triggered: ${stopLossTriggered}`);

// Price below stop loss
currentPrice = 42000;
stopLossTriggered = riskManager.checkStopLoss(longPosition, currentPrice);
console.log(`Price: $${currentPrice} - Stop Loss Triggered: ${stopLossTriggered}`);

console.log('\n6. Check Take Profit Trigger:');
// Price below take profit
currentPrice = 43500;
let takeProfitTriggered = riskManager.checkTakeProfit(longPosition, currentPrice);
console.log(`Price: $${currentPrice} - Take Profit Triggered: ${takeProfitTriggered}`);

// Price at take profit
currentPrice = longTakeProfit;
takeProfitTriggered = riskManager.checkTakeProfit(longPosition, currentPrice);
console.log(`Price: $${currentPrice.toFixed(2)} - Take Profit Triggered: ${takeProfitTriggered}`);

// Price above take profit
currentPrice = 45000;
takeProfitTriggered = riskManager.checkTakeProfit(longPosition, currentPrice);
console.log(`Price: $${currentPrice} - Take Profit Triggered: ${takeProfitTriggered}`);

console.log('\n7. Check Maximum Drawdown:');
const peakEquity = 10000;
let currentEquity = 9500;
let drawdownExceeded = riskManager.checkMaxDrawdown(currentEquity, peakEquity);
console.log(`Current: $${currentEquity}, Peak: $${peakEquity} - Drawdown: ${((peakEquity - currentEquity) / peakEquity * 100).toFixed(2)}% - Exceeded: ${drawdownExceeded}`);

currentEquity = 8900;
drawdownExceeded = riskManager.checkMaxDrawdown(currentEquity, peakEquity);
console.log(`Current: $${currentEquity}, Peak: $${peakEquity} - Drawdown: ${((peakEquity - currentEquity) / peakEquity * 100).toFixed(2)}% - Exceeded: ${drawdownExceeded}`);

console.log('\n8. Emergency Exit Check:');
const metrics1 = {
  currentEquity: 9500,
  peakEquity: 10000,
  consecutiveLosses: 2,
  volatility: 0.05
};
console.log(`Metrics:`, metrics1);
console.log(`Emergency Exit: ${riskManager.shouldEmergencyExit(metrics1)}`);

const metrics2 = {
  currentEquity: 8900,
  peakEquity: 10000,
  consecutiveLosses: 5,
  volatility: 0.12,
  unrealizedPnL: -0.04,
  initialEquity: 10000
};
console.log(`\nMetrics:`, metrics2);
console.log(`Emergency Exit: ${riskManager.shouldEmergencyExit(metrics2)}`);

console.log('\n9. Calculate Position P&L:');
const position1 = { side: 'LONG', entryPrice: 43000, size: 0.023 };
currentPrice = 44500;
const pnl1 = riskManager.calculatePositionPnL(position1, currentPrice);
console.log(`LONG @ $${position1.entryPrice}, Size: ${position1.size}, Current: $${currentPrice}`);
console.log(`  P&L: $${pnl1.pnl.toFixed(2)} (${(pnl1.pnlPct * 100).toFixed(2)}%)`);

const position2 = { side: 'SHORT', entryPrice: 43000, size: 0.023 };
currentPrice = 42000;
const pnl2 = riskManager.calculatePositionPnL(position2, currentPrice);
console.log(`SHORT @ $${position2.entryPrice}, Size: ${position2.size}, Current: $${currentPrice}`);
console.log(`  P&L: $${pnl2.pnl.toFixed(2)} (${(pnl2.pnlPct * 100).toFixed(2)}%)`);

console.log('\n=== Test Complete ===\n');
