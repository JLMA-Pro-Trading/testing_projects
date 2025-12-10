/**
 * @neural-trader/neural
 * Neural network training and prediction
 * Version: 2.6.0
 */

const neuralTrader = require('neural-trader');

// Re-export neural classes
const {
  NeuralTrader
} = neuralTrader;

// Re-export neural functions (7 total)
const {
  neuralTrain,
  neuralPredict,
  neuralBacktest,
  neuralEvaluate,
  neuralForecast,
  neuralOptimize,
  neuralModelStatus
} = neuralTrader;

module.exports = {
  // Classes
  NeuralTrader,

  // Functions
  neuralTrain,
  neuralPredict,
  neuralBacktest,
  neuralEvaluate,
  neuralForecast,
  neuralOptimize,
  neuralModelStatus
};
