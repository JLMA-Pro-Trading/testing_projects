# @neural-trader/backtesting

Backtesting engine and historical simulation for Neural Trader.

## Installation

```bash
npm install @neural-trader/backtesting
```

## Usage

```javascript
const {
  runBacktest,
  BacktestEngine
} = require('@neural-trader/backtesting');

// Run a backtest
const result = await runBacktest({
  strategy: 'momentum',
  symbol: 'AAPL',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

// Use backtest engine
const engine = new BacktestEngine({
  initialCapital: 100000,
  commission: 0.001
});
```

## API

### Classes

- `BacktestEngine` - High-performance backtesting engine

### Functions

- `backtestStrategy()` - Backtest a trading strategy
- `runBacktest()` - Run a complete backtest
- `quickBacktest()` - Fast backtest execution
- `quickAnalysis()` - Quick performance analysis
- `compareBacktests()` - Compare multiple backtests
- `neuralBacktest()` - Neural network backtesting

## License

MIT OR Apache-2.0
