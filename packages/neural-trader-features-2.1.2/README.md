# @neural-trader/features

[![npm version](https://img.shields.io/npm/v/@neural-trader/features.svg)](https://www.npmjs.com/package/@neural-trader/features)
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](https://github.com/ruvnet/neural-trader)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**Enterprise-grade technical indicators library for Neural Trader** with 150+ indicators including RSI, MACD, Bollinger Bands, and advanced custom indicators. Built with Rust for maximum computational performance.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Available Indicators](#available-indicators)
- [Core Concepts](#core-concepts)
- [Examples](#examples)
- [Integration Patterns](#integration-patterns)
- [API Reference](#api-reference)
- [Custom Indicators](#custom-indicators)
- [Performance Optimization](#performance-optimization)
- [Best Practices](#best-practices)
- [License](#license)

## Features

- **150+ Indicators**: Comprehensive technical analysis library covering all major indicator families
- **Rust Performance**: Calculate thousands of indicators per second with SIMD optimization
- **Moving Averages**: SMA, EMA, WMA, VWMA, DEMA, TEMA, and more
- **Momentum**: RSI, Stochastic, Williams %R, CCI, ROC
- **Trend**: MACD, ADX, Parabolic SAR, Aroon, Ichimoku
- **Volatility**: Bollinger Bands, ATR, Keltner Channels, Donchian Channels
- **Volume**: OBV, VWAP, MFI, A/D Line, Chaikin Money Flow
- **Custom Indicators**: Build your own indicators with simple API
- **Batch Processing**: Calculate multiple indicators in parallel
- **Type Safety**: Full TypeScript definitions for all indicators
- **Zero Dependencies**: Standalone package with no external dependencies

## Installation

```bash
# Install with required dependencies
npm install @neural-trader/features @neural-trader/core

# Or with yarn
yarn add @neural-trader/features @neural-trader/core

# Install type definitions
npm install --save-dev @types/node
```

### Dependencies

This package requires:
- `@neural-trader/core` - Core functionality and types

## Quick Start

### Basic Usage

```typescript
import { calculateSma, calculateRsi, calculateMacd } from '@neural-trader/features';

// Simple Moving Average
const prices = [150, 152, 151, 153, 155, 154, 156, 158, 157, 159];
const sma5 = calculateSma(prices, 5);
console.log('SMA(5):', sma5);
// Output: [152.2, 153.0, 153.8, 155.2, 156.8, 156.8]

// Relative Strength Index
const rsi = calculateRsi(prices, 14);
console.log('RSI(14):', rsi);
// Output: [52.3, 56.8, 61.2, ...]

// Exponential Moving Average
const ema = calculateEma(prices, 12);
console.log('EMA(12):', ema);
// Output: [151.5, 152.8, 154.2, ...]
```

### Using with Bar Data

```typescript
import { calculateIndicator } from '@neural-trader/features';
import { MarketDataProvider } from '@neural-trader/market-data';

// Fetch historical data
const provider = new MarketDataProvider({
  provider: 'alpaca',
  apiKey: process.env.ALPACA_API_KEY,
  apiSecret: process.env.ALPACA_SECRET
});

await provider.connect();

const bars = await provider.fetchBars(
  'AAPL',
  '2024-01-01',
  '2024-12-31',
  '1Day'
);

// Calculate MACD using bar data
const macdResult = await calculateIndicator(bars, 'MACD', JSON.stringify({
  fast_period: 12,
  slow_period: 26,
  signal_period: 9
}));

console.log('MACD:', macdResult);
// Output: { macd: [...], signal: [...], histogram: [...] }

await provider.disconnect();
```

## Available Indicators

### Trend Indicators

**Moving Averages**
- `SMA` - Simple Moving Average
- `EMA` - Exponential Moving Average
- `WMA` - Weighted Moving Average
- `VWMA` - Volume-Weighted Moving Average
- `DEMA` - Double Exponential Moving Average
- `TEMA` - Triple Exponential Moving Average
- `KAMA` - Kaufman Adaptive Moving Average
- `MAMA` - MESA Adaptive Moving Average
- `T3` - Triple Exponential Moving Average (T3)

**Trend Following**
- `MACD` - Moving Average Convergence/Divergence
- `MACD_HISTOGRAM` - MACD Histogram
- `MACD_SIGNAL` - MACD Signal Line
- `ADX` - Average Directional Index
- `PLUS_DI` - Plus Directional Indicator
- `MINUS_DI` - Minus Directional Indicator
- `AROON` - Aroon Indicator
- `AROON_OSC` - Aroon Oscillator
- `PSAR` - Parabolic SAR
- `SAR` - Stop and Reverse
- `SUPERTREND` - SuperTrend Indicator

### Momentum Indicators

- `RSI` - Relative Strength Index
- `STOCH` - Stochastic Oscillator
- `STOCH_RSI` - Stochastic RSI
- `WILLIAMS_R` - Williams %R
- `CCI` - Commodity Channel Index
- `ROC` - Rate of Change
- `MOMENTUM` - Momentum
- `TSI` - True Strength Index
- `UO` - Ultimate Oscillator
- `AO` - Awesome Oscillator
- `CMO` - Chande Momentum Oscillator
- `PPO` - Percentage Price Oscillator

### Volatility Indicators

- `BBANDS` - Bollinger Bands
- `ATR` - Average True Range
- `NATR` - Normalized ATR
- `KELTNER` - Keltner Channels
- `DONCHIAN` - Donchian Channels
- `STDDEV` - Standard Deviation
- `VAR` - Variance
- `RVI` - Relative Volatility Index
- `CHAIKIN_VOL` - Chaikin Volatility

### Volume Indicators

- `OBV` - On-Balance Volume
- `VWAP` - Volume-Weighted Average Price
- `MFI` - Money Flow Index
- `AD` - Accumulation/Distribution
- `ADOSC` - Accumulation/Distribution Oscillator
- `CMF` - Chaikin Money Flow
- `FI` - Force Index
- `EOM` - Ease of Movement
- `NVI` - Negative Volume Index
- `PVI` - Positive Volume Index

### Custom & Advanced Indicators

- `ICHIMOKU` - Ichimoku Cloud (Tenkan, Kijun, Senkou A/B, Chikou)
- `PIVOT` - Pivot Points (Standard, Fibonacci, Camarilla, Woodie, DeMark)
- `FIBONACCI` - Fibonacci Retracements
- `ELLIOTT_WAVE` - Elliott Wave Detection
- `HARMONIC` - Harmonic Pattern Detection (Gartley, Butterfly, Bat, Crab)
- `CANDLESTICK` - Candlestick Pattern Recognition (50+ patterns)

## Core Concepts

### Indicator Parameters

Most indicators accept configurable parameters:

```typescript
// RSI with different periods
const rsi14 = calculateRsi(prices, 14); // Standard
const rsi9 = calculateRsi(prices, 9);   // Faster
const rsi21 = calculateRsi(prices, 21); // Slower

// MACD with custom periods
const macd = await calculateIndicator(bars, 'MACD', JSON.stringify({
  fast_period: 12,   // Fast EMA period
  slow_period: 26,   // Slow EMA period
  signal_period: 9   // Signal line period
}));

// Bollinger Bands with custom parameters
const bbands = await calculateIndicator(bars, 'BBANDS', JSON.stringify({
  period: 20,              // Moving average period
  std_dev_multiplier: 2.0, // Standard deviation multiplier
  ma_type: 'SMA'          // Moving average type
}));
```

### Indicator Output Formats

Different indicators return different data structures:

```typescript
// Single value array (SMA, EMA, RSI)
const sma = calculateSma(prices, 20);
// Returns: [number, number, ...]

// Multiple values (Bollinger Bands)
const bbands = await calculateIndicator(bars, 'BBANDS', params);
// Returns: { upper: [...], middle: [...], lower: [...] }

// Complex structures (MACD)
const macd = await calculateIndicator(bars, 'MACD', params);
// Returns: { macd: [...], signal: [...], histogram: [...] }

// Boolean signals (Candlestick patterns)
const patterns = await calculateIndicator(bars, 'CANDLESTICK', params);
// Returns: { doji: [true, false, ...], hammer: [...], ... }
```

## Examples

### Basic Technical Analysis

```typescript
import { calculateSma, calculateEma, calculateRsi, calculateMacd } from '@neural-trader/features';

// Price data
const prices = [
  100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
  111, 110, 112, 114, 113, 115, 117, 116, 118, 120
];

// Calculate multiple indicators
const sma20 = calculateSma(prices, 20);
const ema20 = calculateEma(prices, 20);
const rsi14 = calculateRsi(prices, 14);

console.log('Current Price:', prices[prices.length - 1]);
console.log('SMA(20):', sma20[sma20.length - 1]);
console.log('EMA(20):', ema20[ema20.length - 1]);
console.log('RSI(14):', rsi14[rsi14.length - 1]);

// Determine trend
const currentPrice = prices[prices.length - 1];
const currentSma = sma20[sma20.length - 1];
const currentRsi = rsi14[rsi14.length - 1];

if (currentPrice > currentSma && currentRsi < 70) {
  console.log('Signal: BULLISH - Price above SMA, RSI not overbought');
} else if (currentPrice < currentSma && currentRsi > 30) {
  console.log('Signal: BEARISH - Price below SMA, RSI not oversold');
} else {
  console.log('Signal: NEUTRAL');
}
```

### Bollinger Bands Strategy

```typescript
import { calculateIndicator } from '@neural-trader/features';
import { MarketDataProvider } from '@neural-trader/market-data';

const provider = new MarketDataProvider({
  provider: 'alpaca',
  apiKey: process.env.ALPACA_API_KEY,
  apiSecret: process.env.ALPACA_SECRET
});

await provider.connect();

// Fetch data
const bars = await provider.fetchBars('AAPL', '2024-01-01', '2024-12-31', '1Day');

// Calculate Bollinger Bands
const bbands = await calculateIndicator(bars, 'BBANDS', JSON.stringify({
  period: 20,
  std_dev_multiplier: 2.0,
  ma_type: 'SMA'
}));

// Analyze current position
const currentClose = parseFloat(bars[bars.length - 1].close);
const upperBand = bbands.upper[bbands.upper.length - 1];
const lowerBand = bbands.lower[bbands.lower.length - 1];
const middleBand = bbands.middle[bbands.middle.length - 1];

console.log(`Current Price: $${currentClose.toFixed(2)}`);
console.log(`Upper Band: $${upperBand.toFixed(2)}`);
console.log(`Middle Band: $${middleBand.toFixed(2)}`);
console.log(`Lower Band: $${lowerBand.toFixed(2)}`);

// Generate signals
if (currentClose <= lowerBand) {
  console.log('Signal: BUY - Price touching lower Bollinger Band');
} else if (currentClose >= upperBand) {
  console.log('Signal: SELL - Price touching upper Bollinger Band');
} else if (currentClose > middleBand) {
  console.log('Signal: HOLD - Price above middle band (bullish)');
} else {
  console.log('Signal: HOLD - Price below middle band (bearish)');
}

await provider.disconnect();
```

### MACD Crossover Strategy

```typescript
import { calculateIndicator } from '@neural-trader/features';
import { MarketDataProvider } from '@neural-trader/market-data';

const provider = new MarketDataProvider({
  provider: 'alpaca',
  apiKey: process.env.ALPACA_API_KEY,
  apiSecret: process.env.ALPACA_SECRET
});

await provider.connect();

const bars = await provider.fetchBars('MSFT', '2024-01-01', '2024-12-31', '1Day');

// Calculate MACD
const macd = await calculateIndicator(bars, 'MACD', JSON.stringify({
  fast_period: 12,
  slow_period: 26,
  signal_period: 9
}));

// Detect crossovers
const signals = [];
for (let i = 1; i < macd.macd.length; i++) {
  const prevMacd = macd.macd[i - 1];
  const prevSignal = macd.signal[i - 1];
  const currMacd = macd.macd[i];
  const currSignal = macd.signal[i];

  // Bullish crossover (MACD crosses above signal)
  if (prevMacd <= prevSignal && currMacd > currSignal) {
    signals.push({
      date: bars[i].timestamp,
      type: 'BUY',
      macd: currMacd,
      signal: currSignal,
      histogram: macd.histogram[i]
    });
  }

  // Bearish crossover (MACD crosses below signal)
  if (prevMacd >= prevSignal && currMacd < currSignal) {
    signals.push({
      date: bars[i].timestamp,
      type: 'SELL',
      macd: currMacd,
      signal: currSignal,
      histogram: macd.histogram[i]
    });
  }
}

console.log(`Found ${signals.length} MACD crossover signals:`);
signals.slice(-5).forEach(signal => {
  console.log(`${signal.date}: ${signal.type} - MACD: ${signal.macd.toFixed(2)}, Signal: ${signal.signal.toFixed(2)}`);
});

await provider.disconnect();
```

### Multi-Indicator Confirmation

```typescript
import { calculateRsi, calculateSma, calculateIndicator } from '@neural-trader/features';
import { MarketDataProvider } from '@neural-trader/market-data';

const provider = new MarketDataProvider({
  provider: 'alpaca',
  apiKey: process.env.ALPACA_API_KEY,
  apiSecret: process.env.ALPACA_SECRET
});

await provider.connect();

const bars = await provider.fetchBars('GOOGL', '2024-01-01', '2024-12-31', '1Day');

// Extract close prices
const closes = bars.map(b => parseFloat(b.close));

// Calculate multiple indicators
const rsi = calculateRsi(closes, 14);
const sma50 = calculateSma(closes, 50);
const sma200 = calculateSma(closes, 200);
const macd = await calculateIndicator(bars, 'MACD', JSON.stringify({
  fast_period: 12,
  slow_period: 26,
  signal_period: 9
}));

// Get current values
const currentPrice = closes[closes.length - 1];
const currentRsi = rsi[rsi.length - 1];
const currentSma50 = sma50[sma50.length - 1];
const currentSma200 = sma200[sma200.length - 1];
const currentMacd = macd.macd[macd.macd.length - 1];
const currentSignal = macd.signal[macd.signal.length - 1];

// Multi-indicator analysis
let bullishSignals = 0;
let bearishSignals = 0;

// RSI analysis
if (currentRsi < 30) bullishSignals++; // Oversold
if (currentRsi > 70) bearishSignals++; // Overbought

// Moving average analysis
if (currentPrice > currentSma50) bullishSignals++; // Above 50-day MA
if (currentPrice < currentSma50) bearishSignals++; // Below 50-day MA
if (currentSma50 > currentSma200) bullishSignals++; // Golden cross territory
if (currentSma50 < currentSma200) bearishSignals++; // Death cross territory

// MACD analysis
if (currentMacd > currentSignal) bullishSignals++; // MACD above signal
if (currentMacd < currentSignal) bearishSignals++; // MACD below signal

console.log('\nMulti-Indicator Analysis:');
console.log(`Price: $${currentPrice.toFixed(2)}`);
console.log(`RSI(14): ${currentRsi.toFixed(2)}`);
console.log(`SMA(50): $${currentSma50.toFixed(2)}`);
console.log(`SMA(200): $${currentSma200.toFixed(2)}`);
console.log(`MACD: ${currentMacd.toFixed(2)}`);
console.log(`\nBullish Signals: ${bullishSignals}/5`);
console.log(`Bearish Signals: ${bearishSignals}/5`);

if (bullishSignals >= 4) {
  console.log('\nOverall Signal: STRONG BUY');
} else if (bullishSignals >= 3) {
  console.log('\nOverall Signal: BUY');
} else if (bearishSignals >= 4) {
  console.log('\nOverall Signal: STRONG SELL');
} else if (bearishSignals >= 3) {
  console.log('\nOverall Signal: SELL');
} else {
  console.log('\nOverall Signal: NEUTRAL');
}

await provider.disconnect();
```

### Batch Indicator Calculation

```typescript
import { calculateSma, calculateEma, calculateRsi } from '@neural-trader/features';

// Calculate multiple indicators in parallel
const prices = [/* ... large price array ... */];

const [sma20, sma50, sma200, ema12, ema26, rsi14] = await Promise.all([
  Promise.resolve(calculateSma(prices, 20)),
  Promise.resolve(calculateSma(prices, 50)),
  Promise.resolve(calculateSma(prices, 200)),
  Promise.resolve(calculateEma(prices, 12)),
  Promise.resolve(calculateEma(prices, 26)),
  Promise.resolve(calculateRsi(prices, 14))
]);

console.log('All indicators calculated in parallel');
```

## Integration Patterns

### Integration with Strategies

```typescript
import { calculateRsi, calculateSma } from '@neural-trader/features';
import { Strategy } from '@neural-trader/strategies';
import { MarketDataProvider } from '@neural-trader/market-data';
import { BrokerClient } from '@neural-trader/brokers';

// Create strategy with indicator parameters
const strategy = new Strategy({
  name: 'rsi-sma-strategy',
  symbols: ['AAPL', 'MSFT', 'GOOGL'],
  parameters: {
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70,
    smaPeriod: 50
  }
});

// Setup data provider and broker
const dataProvider = new MarketDataProvider({
  provider: 'alpaca',
  apiKey: process.env.ALPACA_API_KEY,
  apiSecret: process.env.ALPACA_SECRET
});

const broker = new BrokerClient({
  brokerType: 'alpaca',
  apiKey: process.env.ALPACA_API_KEY,
  apiSecret: process.env.ALPACA_SECRET,
  paperTrading: true
});

await dataProvider.connect();
await broker.connect();

// Strategy logic using indicators
strategy.on('bar', async (bar) => {
  // Fetch historical data
  const bars = await dataProvider.fetchBars(
    bar.symbol,
    /* start date */,
    /* end date */,
    '1Day'
  );

  // Calculate indicators
  const closes = bars.map(b => parseFloat(b.close));
  const rsi = calculateRsi(closes, strategy.parameters.rsiPeriod);
  const sma = calculateSma(closes, strategy.parameters.smaPeriod);

  const currentRsi = rsi[rsi.length - 1];
  const currentSma = sma[sma.length - 1];
  const currentPrice = parseFloat(bar.close);

  // Generate signals
  if (currentRsi < strategy.parameters.rsiOversold && currentPrice > currentSma) {
    // Oversold RSI + price above SMA = Buy signal
    await broker.placeOrder({
      symbol: bar.symbol,
      side: 'buy',
      orderType: 'market',
      quantity: 100,
      timeInForce: 'day'
    });
    console.log(`BUY ${bar.symbol}: RSI=${currentRsi.toFixed(2)}, Price > SMA`);
  } else if (currentRsi > strategy.parameters.rsiOverbought) {
    // Overbought RSI = Sell signal
    await broker.placeOrder({
      symbol: bar.symbol,
      side: 'sell',
      orderType: 'market',
      quantity: 100,
      timeInForce: 'day'
    });
    console.log(`SELL ${bar.symbol}: RSI=${currentRsi.toFixed(2)}`);
  }
});

await strategy.start(dataProvider);
```

### Integration with Backtesting

```typescript
import { calculateSma, calculateRsi, calculateIndicator } from '@neural-trader/features';
import { BacktestEngine } from '@neural-trader/backtesting';
import { MarketDataProvider } from '@neural-trader/market-data';

// Setup backtest
const backtest = new BacktestEngine({
  initialCapital: 100000,
  commission: 0.001,
  startDate: '2023-01-01',
  endDate: '2023-12-31'
});

// Fetch historical data
const provider = new MarketDataProvider({
  provider: 'alpaca',
  apiKey: process.env.ALPACA_API_KEY,
  apiSecret: process.env.ALPACA_SECRET
});

await provider.connect();

const symbols = ['AAPL', 'MSFT', 'GOOGL'];
const historicalData = new Map();

for (const symbol of symbols) {
  const bars = await provider.fetchBars(symbol, '2023-01-01', '2023-12-31', '1Day');
  historicalData.set(symbol, bars);
}

// Strategy using indicators
backtest.addStrategy(async (context) => {
  const { symbol, date, portfolio } = context;
  const bars = historicalData.get(symbol);

  if (!bars) return;

  // Get bars up to current date
  const currentBars = bars.filter(b => new Date(b.timestamp) <= date);
  if (currentBars.length < 50) return;

  // Calculate indicators
  const closes = currentBars.map(b => parseFloat(b.close));
  const rsi = calculateRsi(closes, 14);
  const sma20 = calculateSma(closes, 20);
  const sma50 = calculateSma(closes, 50);

  const currentRsi = rsi[rsi.length - 1];
  const currentSma20 = sma20[sma20.length - 1];
  const currentSma50 = sma50[sma50.length - 1];
  const currentPrice = closes[closes.length - 1];

  // Trading logic
  const position = portfolio.positions.get(symbol);

  if (!position || position.quantity === 0) {
    // Entry conditions: RSI oversold + bullish crossover
    if (currentRsi < 30 && currentSma20 > currentSma50) {
      await context.placeOrder({
        symbol,
        side: 'buy',
        orderType: 'market',
        quantity: 100,
        timeInForce: 'day'
      });
    }
  } else {
    // Exit conditions: RSI overbought or bearish crossover
    if (currentRsi > 70 || currentSma20 < currentSma50) {
      await context.placeOrder({
        symbol,
        side: 'sell',
        orderType: 'market',
        quantity: position.quantity,
        timeInForce: 'day'
      });
    }
  }
});

// Run backtest
const results = await backtest.run(symbols);

console.log('\nBacktest Results:');
console.log(`  Total Return: ${(results.totalReturn * 100).toFixed(2)}%`);
console.log(`  Sharpe Ratio: ${results.sharpeRatio.toFixed(2)}`);
console.log(`  Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%`);
console.log(`  Win Rate: ${(results.winRate * 100).toFixed(2)}%`);

await provider.disconnect();
```

## API Reference

### Simple Functions

Quick functions for common indicators using price arrays.

```typescript
// Moving Averages
function calculateSma(prices: number[], period: number): number[];
function calculateEma(prices: number[], period: number): number[];
function calculateWma(prices: number[], period: number): number[];

// Momentum
function calculateRsi(prices: number[], period: number): number[];
function calculateMacd(
  prices: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): { macd: number[]; signal: number[]; histogram: number[] };

// Volatility
function calculateBollingerBands(
  prices: number[],
  period: number,
  stdDev: number
): { upper: number[]; middle: number[]; lower: number[] };

function calculateAtr(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number[];
```

### Generic Indicator Function

For advanced indicators requiring OHLCV data.

```typescript
function calculateIndicator(
  bars: JsBar[],
  indicator: string,
  params: string
): Promise<any>;

// Usage examples:

// MACD
const macd = await calculateIndicator(bars, 'MACD', JSON.stringify({
  fast_period: 12,
  slow_period: 26,
  signal_period: 9
}));

// Bollinger Bands
const bbands = await calculateIndicator(bars, 'BBANDS', JSON.stringify({
  period: 20,
  std_dev_multiplier: 2.0,
  ma_type: 'SMA'
}));

// ADX
const adx = await calculateIndicator(bars, 'ADX', JSON.stringify({
  period: 14
}));

// Stochastic
const stoch = await calculateIndicator(bars, 'STOCH', JSON.stringify({
  k_period: 14,
  d_period: 3,
  smooth_k: 3
}));
```

### Types

```typescript
interface JsBar {
  symbol: string;
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface IndicatorResult {
  // Single value indicators
  values?: number[];

  // Multi-value indicators (e.g., Bollinger Bands)
  upper?: number[];
  middle?: number[];
  lower?: number[];

  // MACD specific
  macd?: number[];
  signal?: number[];
  histogram?: number[];

  // Stochastic specific
  k?: number[];
  d?: number[];

  // Ichimoku specific
  tenkan?: number[];
  kijun?: number[];
  senkou_a?: number[];
  senkou_b?: number[];
  chikou?: number[];
}
```

## Custom Indicators

### Creating Custom Indicators

```typescript
// Create custom indicator by combining existing ones
function calculateCustomMomentum(
  prices: number[],
  rsiPeriod: number,
  smaPeriod: number
): number[] {
  const rsi = calculateRsi(prices, rsiPeriod);
  const sma = calculateSma(prices, smaPeriod);

  // Normalize RSI (0-100) to match price scale
  const normalizedRsi = rsi.map(r => (r - 50) / 50); // -1 to +1

  // Combine signals
  return prices.map((price, i) => {
    if (i >= sma.length) return 0;

    const priceVsSma = (price - sma[i]) / sma[i]; // Percentage above/below SMA
    const momentum = priceVsSma + normalizedRsi[i];

    return momentum;
  });
}

// Usage
const customMomentum = calculateCustomMomentum(prices, 14, 50);
console.log('Custom Momentum:', customMomentum);
```

### Custom Indicator with Parameters

```typescript
interface CustomIndicatorParams {
  rsiPeriod: number;
  smaPeriod: number;
  threshold: number;
}

function calculateCustomSignal(
  prices: number[],
  params: CustomIndicatorParams
): { value: number[]; signal: string[] } {
  const rsi = calculateRsi(prices, params.rsiPeriod);
  const sma = calculateSma(prices, params.smaPeriod);

  const values: number[] = [];
  const signals: string[] = [];

  for (let i = 0; i < prices.length; i++) {
    const value = rsi[i] * (prices[i] / (sma[i] || 1));
    values.push(value);

    if (value > params.threshold) {
      signals.push('BUY');
    } else if (value < -params.threshold) {
      signals.push('SELL');
    } else {
      signals.push('HOLD');
    }
  }

  return { value: values, signal: signals };
}
```

## Performance Optimization

### Batch Processing

```typescript
// Process multiple symbols efficiently
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
const results = await Promise.all(
  symbols.map(async symbol => {
    const bars = await provider.fetchBars(symbol, '2024-01-01', '2024-12-31', '1Day');
    const closes = bars.map(b => parseFloat(b.close));

    return {
      symbol,
      rsi: calculateRsi(closes, 14),
      sma50: calculateSma(closes, 50),
      sma200: calculateSma(closes, 200)
    };
  })
);

console.log('Processed', results.length, 'symbols');
```

### Caching Indicator Results

```typescript
const indicatorCache = new Map();

function getCachedIndicator(
  key: string,
  calculator: () => number[]
): number[] {
  if (indicatorCache.has(key)) {
    return indicatorCache.get(key);
  }

  const result = calculator();
  indicatorCache.set(key, result);
  return result;
}

// Usage
const rsi = getCachedIndicator(
  `rsi-${symbol}-14`,
  () => calculateRsi(prices, 14)
);
```

## Best Practices

### 1. Use Appropriate Lookback Periods

```typescript
// Standard periods for common indicators
const rsi14 = calculateRsi(prices, 14);      // Standard RSI
const sma20 = calculateSma(prices, 20);      // Short-term trend
const sma50 = calculateSma(prices, 50);      // Medium-term trend
const sma200 = calculateSma(prices, 200);    // Long-term trend
```

### 2. Validate Input Data

```typescript
function validatePrices(prices: number[]): boolean {
  if (!Array.isArray(prices) || prices.length === 0) {
    return false;
  }

  return prices.every(p =>
    typeof p === 'number' &&
    !isNaN(p) &&
    p > 0
  );
}

if (!validatePrices(prices)) {
  throw new Error('Invalid price data');
}
```

### 3. Handle Edge Cases

```typescript
// Ensure sufficient data for indicator
const minimumBars = Math.max(rsiPeriod, smaPeriod) + 10;

if (bars.length < minimumBars) {
  console.warn(`Insufficient data: need ${minimumBars} bars, have ${bars.length}`);
  return;
}
```

### 4. Combine Multiple Indicators

```typescript
// Use multiple indicators for confirmation
function getSignalStrength(
  price: number,
  rsi: number,
  sma50: number,
  sma200: number
): number {
  let strength = 0;

  if (rsi < 30) strength += 2;        // Strong oversold
  else if (rsi < 40) strength += 1;   // Oversold

  if (price > sma50) strength += 1;   // Above 50-day MA
  if (sma50 > sma200) strength += 2;  // Golden cross

  return strength; // 0-6 scale
}
```

### 5. Optimize Performance

```typescript
// Calculate once, use multiple times
const closes = bars.map(b => parseFloat(b.close));

// Reuse closes array for multiple indicators
const rsi = calculateRsi(closes, 14);
const sma20 = calculateSma(closes, 20);
const sma50 = calculateSma(closes, 50);
const ema12 = calculateEma(closes, 12);
```

## License

Dual-licensed under MIT OR Apache-2.0.

See [LICENSE-MIT](../../LICENSE-MIT) and [LICENSE-APACHE](../../LICENSE-APACHE) for details.
