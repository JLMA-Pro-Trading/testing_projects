/**
 * @neural-trader/strategies
 * Strategy management and backtesting functionality
 * Version: 2.6.0
 */

const neuralTrader = require('neural-trader');

// Re-export strategy classes
const {
  StrategyRunner,
  BacktestEngine
} = neuralTrader;

// Re-export strategy functions (14 total)
const {
  backtestStrategy,
  runBacktest,
  listStrategies,
  optimizeStrategy,
  switchActiveStrategy,
  quickBacktest,
  quickAnalysis,
  compareBacktests,
  getStrategyInfo,
  getStrategyComparison,
  adaptiveStrategySelection,
  recommendStrategy,
  optimizeParameters,
  monitorStrategyHealth
} = neuralTrader;

module.exports = {
  // Classes
  StrategyRunner,
  BacktestEngine,

  // Functions
  backtestStrategy,
  runBacktest,
  listStrategies,
  optimizeStrategy,
  switchActiveStrategy,
  quickBacktest,
  quickAnalysis,
  compareBacktests,
  getStrategyInfo,
  getStrategyComparison,
  adaptiveStrategySelection,
  recommendStrategy,
  optimizeParameters,
  monitorStrategyHealth
};
