/**
 * @neural-trader/backtesting
 * Backtesting engine and historical simulation
 * Version: 2.6.0
 */

const neuralTrader = require('neural-trader');

// Re-export backtesting classes
const {
  BacktestEngine
} = neuralTrader;

// Re-export backtesting functions
const {
  backtestStrategy,
  runBacktest,
  quickBacktest,
  quickAnalysis,
  compareBacktests,
  neuralBacktest
} = neuralTrader;

module.exports = {
  // Classes
  BacktestEngine,

  // Functions
  backtestStrategy,
  runBacktest,
  quickBacktest,
  quickAnalysis,
  compareBacktests,
  neuralBacktest
};
