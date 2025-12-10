# @neural-trader/strategies

Strategy management and backtesting functionality for Neural Trader.

## Installation

```bash
npm install @neural-trader/strategies
```

## Usage

```javascript
const {
  backtestStrategy,
  runBacktest,
  StrategyRunner
} = require('@neural-trader/strategies');

// Run a backtest
const result = await runBacktest({
  strategy: 'momentum',
  symbol: 'AAPL',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

// Use strategy runner class
const runner = new StrategyRunner({
  strategy: 'mean_reversion',
  parameters: { period: 20 }
});
```

## API

### Classes

- `StrategyRunner` - Execute trading strategies
- `BacktestEngine` - Run historical backtests

### Functions

- `backtestStrategy()` - Backtest a trading strategy
- `runBacktest()` - Run a complete backtest
- `listStrategies()` - List available strategies
- `optimizeStrategy()` - Optimize strategy parameters
- `switchActiveStrategy()` - Switch between strategies
- `quickBacktest()` - Fast backtest execution
- `quickAnalysis()` - Quick strategy analysis
- `compareBacktests()` - Compare multiple backtests
- `getStrategyInfo()` - Get strategy details
- `getStrategyComparison()` - Compare strategies
- `adaptiveStrategySelection()` - Adaptive strategy selection
- `recommendStrategy()` - Get strategy recommendations
- `optimizeParameters()` - Optimize strategy parameters
- `monitorStrategyHealth()` - Monitor strategy performance

## License

MIT OR Apache-2.0
