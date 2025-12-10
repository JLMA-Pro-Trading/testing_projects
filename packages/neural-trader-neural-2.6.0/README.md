# @neural-trader/neural

Neural network training and prediction for Neural Trader.

## Installation

```bash
npm install @neural-trader/neural
```

## Usage

```javascript
const {
  neuralTrain,
  neuralPredict,
  NeuralTrader
} = require('@neural-trader/neural');

// Train a model
const model = await neuralTrain({
  modelType: 'lstm',
  data: trainingData,
  epochs: 100
});

// Make predictions
const prediction = await neuralPredict({
  modelId: model.id,
  input: marketData
});

// Use neural trader class
const trader = new NeuralTrader({
  modelType: 'transformer',
  features: ['price', 'volume', 'sentiment']
});
```

## API

### Classes

- `NeuralTrader` - Neural trading system

### Functions

- `neuralTrain()` - Train neural network
- `neuralPredict()` - Make predictions
- `neuralBacktest()` - Backtest neural model
- `neuralEvaluate()` - Evaluate model performance
- `neuralForecast()` - Generate forecasts
- `neuralOptimize()` - Optimize model hyperparameters
- `neuralModelStatus()` - Get model status

## License

MIT OR Apache-2.0
