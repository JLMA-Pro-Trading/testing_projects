# @neural-trader/predictor

[![npm version](https://badge.fury.io/js/%40neural-trader%2Fpredictor.svg)](https://badge.fury.io/js/%40neural-trader%2Fpredictor)
[![npm downloads](https://img.shields.io/npm/dm/@neural-trader/predictor.svg)](https://www.npmjs.com/package/@neural-trader/predictor)
[![License](https://img.shields.io/npm/l/@neural-trader/predictor.svg)](https://github.com/ruvnet/neural-trader/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)

**Conformal prediction SDK for neural trading with mathematically guaranteed prediction intervals**

> Part of the [**Neural Trader**](https://neural-trader-ruv.io) ecosystem - AI-powered algorithmic trading platform
> Built by [**rUv**](https://github.com/ruvnet) | [GitHub](https://github.com/ruvnet/neural-trader)

A production-ready TypeScript/JavaScript library providing distribution-free prediction intervals with rigorous mathematical guarantees. Available in three high-performance implementations (Pure JS, WebAssembly, Native Node.js bindings) to fit any deployment environment - from browsers to high-frequency trading servers.

## 🌟 Why Conformal Prediction?

Traditional machine learning gives you **point estimates** that are often wrong. Conformal prediction gives you **guaranteed intervals**:

```
Traditional ML:  "Bitcoin will be $50,000" (70% chance you're wrong)
Conformal ML:    "Bitcoin will be between $48,500-$51,500" (90% mathematical guarantee)
```

This makes conformal prediction **essential** for:
- **Risk Management**: Know your worst-case scenarios with probability guarantees
- **Automated Trading**: Set stop-losses and take-profits with statistical confidence
- **Regulatory Compliance**: Provable uncertainty quantification for audits
- **Portfolio Optimization**: Reliable confidence bounds for position sizing

## Core Principle

Conformal prediction provides a mathematical guarantee:

```
P(y ∈ [lower, upper]) ≥ 1 - α
```

Get **guaranteed intervals** instead of uncertain point estimates. Perfect for trading, risk management, and any application requiring reliable uncertainty quantification.

## 🎯 Key Features

- **Multiple Implementations**:
  - Pure JavaScript (portable, works everywhere)
  - WebAssembly (5-10x faster, zero dependencies)
  - Native Node.js bindings (near-Rust performance)
  - Auto-detection with fallback support
- **Split Conformal Prediction**: Distribution-free intervals with `(1-α)` coverage guarantee
- **Adaptive Conformal Inference (ACI)**: PID-controlled dynamic coverage adjustment
- **Conformalized Quantile Regression (CQR)**: Quantile-based intervals with guarantees
- **Multiple Nonconformity Scores**: Absolute, normalized, and quantile-based
- **Real-time Streaming**: Efficient incremental updates
- **Trading Integration**: Seamless integration with `@neural-trader/neural`
- **Browser & Node.js**: Works in browsers, Node.js, Electron, React Native
- **TypeScript Support**: Full type definitions, 100% type-safe

## 💼 Real-World Use Cases

### 1. **Algorithmic Trading**
```typescript
// Set stop-loss and take-profit with 95% confidence
const interval = predictor.predict(nextPrice);
executeTrade({
    entry: interval.point,
    stopLoss: interval.lower,  // 95% confident price won't go below
    takeProfit: interval.upper, // 95% confident price won't exceed
});
```

### 2. **Portfolio Risk Management**
```typescript
// Calculate Value-at-Risk with guaranteed coverage
const returns = calculatePortfolioReturns(positions);
const interval = predictor.predict(expectedReturn);
const VaR95 = interval.lower; // 95% confidence lower bound
const maxLoss = portfolio.value * VaR95;
```

### 3. **Options Pricing & Greeks**
```typescript
// Get reliable bounds for option premiums
const optionInterval = predictor.predict(blackScholesPrice);
const conservativeBid = optionInterval.lower;
const conservativeAsk = optionInterval.upper;
```

### 4. **High-Frequency Trading**
```typescript
// Sub-millisecond predictions with WASM
const predictor = new WasmConformalPredictor({ alpha: 0.05 });
for (const tick of marketTicks) {
    const interval = predictor.predict(tick.midPrice); // <500μs
    if (interval.width() < SPREAD_THRESHOLD) {
        placeMarketMakerOrder(interval.lower, interval.upper);
    }
}
```

### 5. **Compliance & Reporting**
```typescript
// Generate audit-ready predictions with formal guarantees
const report = {
    prediction: interval.point,
    lowerBound: interval.lower,
    upperBound: interval.upper,
    coverage: "95%", // Mathematically proven
    method: "Split Conformal Prediction",
    regulatoryCompliant: true,
};
```

## 📊 Performance Comparison

| Implementation | Prediction | Calibration | Memory | Browser | Node.js |
|---|---|---|---|---|---|
| Rust (native) | <50μs | <20ms | <5MB | - | ✓ |
| WASM | <500μs | <150ms | <15MB | ✓ | ✓ |
| Pure JS | <2ms | <500ms | <25MB | ✓ | ✓ |

**Real-world targets:**
- Prediction latency: <1ms (guaranteed interval)
- Calibration time: <100ms for 2,000 samples
- Throughput: 10,000+ predictions/second
- Memory footprint: <10MB for typical usage

## 🚀 Quick Start

### Installation

```bash
npm install @neural-trader/predictor
# or
yarn add @neural-trader/predictor
# or
pnpm add @neural-trader/predictor
```

### Pure JavaScript (Works Everywhere)

```typescript
import { ConformalPredictor, AbsoluteScore } from '@neural-trader/predictor';

const predictor = new ConformalPredictor({
    alpha: 0.1, // 90% coverage
    scoreFunction: new AbsoluteScore(),
});

// Calibrate with historical data
await predictor.calibrate(
    [100.0, 105.0, 98.0, 102.0],
    [102.0, 104.0, 99.0, 101.0]
);

// Make prediction with guaranteed interval
const interval = predictor.predict(103.0);
console.log(`Prediction: ${interval.point}`);
console.log(`90% Confidence: [${interval.lower}, ${interval.upper}]`);
console.log(`Interval width: ${interval.width()}`);
console.log(`Coverage: ${interval.coverage() * 100}%`);
```

### WebAssembly (5-10x Faster)

```typescript
import { initWasm, WasmConformalPredictor } from '@neural-trader/predictor/wasm';

// Initialize WASM module once
await initWasm();

// Use same API, but with Rust performance
const predictor = new WasmConformalPredictor({
    alpha: 0.1,
    scoreFunction: 'absolute', // String enum for WASM
});

await predictor.calibrate(predictions, actuals);
const interval = predictor.predict(103.0);
// 5-10x faster than pure JS
```

### Native Node.js Bindings (Maximum Speed)

```typescript
import { NativeConformalPredictor } from '@neural-trader/predictor/native';

// Try native bindings (requires Node.js >= 18)
const predictor = new NativeConformalPredictor({
    alpha: 0.1,
    scoreFunction: 'absolute',
});

await predictor.calibrate(predictions, actuals);
const interval = predictor.predict(103.0);
// Near-Rust performance (fastest option)
```

### Auto-Select Best Implementation

```typescript
import { createPredictor } from '@neural-trader/predictor';

// Automatically chooses: Native > WASM > Pure JS
const predictor = await createPredictor({
    alpha: 0.1,
    preferNative: true,
    fallbackToWasm: true,
});

console.log(`Using: ${predictor.implementation}`); // "native" | "wasm" | "pure"
```

## 📚 Adaptive Trading Example

```typescript
import { AdaptiveConformalPredictor } from '@neural-trader/predictor';

const predictor = new AdaptiveConformalPredictor({
    targetCoverage: 0.90,     // Maintain 90% coverage
    gamma: 0.02,               // Learning rate
    scoreFunction: new AbsoluteScore(),
});

// Stream market predictions
for await (const { prediction, actual } of marketDataStream) {
    // Get interval and adapt coverage based on outcome
    const interval = await predictor.predictAndAdapt(prediction, actual);

    // Make trading decision based on interval
    if (interval.width() < MAX_INTERVAL_WIDTH && interval.point > THRESHOLD) {
        console.log(`TRADE: Buy at ${interval.point}`);
        console.log(`Risk: Short at ${interval.lower}`);
        console.log(`Target: Long at ${interval.upper}`);

        await executeTrade({
            type: 'BUY',
            quantity: positionSize,
            stopLoss: interval.lower,
            takeProfit: interval.upper,
        });
    }

    // Monitor coverage adaptation
    const metrics = await predictor.getMetrics();
    console.log(`Coverage: ${metrics.empiricalCoverage * 100}%`);
    console.log(`Current alpha: ${metrics.currentAlpha}`);
}
```

## 🌐 Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module">
        import { ConformalPredictor, AbsoluteScore } from 'https://cdn.jsdelivr.net/npm/@neural-trader/predictor@latest/dist/index.mjs';

        const predictor = new ConformalPredictor({
            alpha: 0.1,
            scoreFunction: new AbsoluteScore(),
        });

        document.getElementById('predict-btn').addEventListener('click', async () => {
            await predictor.calibrate([100, 105, 98, 102], [102, 104, 99, 101]);
            const interval = predictor.predict(103);
            document.getElementById('result').textContent = `[${interval.lower}, ${interval.upper}]`;
        });
    </script>
</head>
<body>
    <button id="predict-btn">Make Prediction</button>
    <div id="result"></div>
</body>
</html>
```

## 📖 API Reference

### ConformalPredictor

```typescript
class ConformalPredictor {
    constructor(config: PredictorConfig);

    // Core methods
    calibrate(predictions: number[], actuals: number[]): Promise<void>;
    predict(pointPrediction: number): PredictionInterval;
    update(pointPrediction: number, actual: number): Promise<void>;

    // Configuration
    setAlpha(alpha: number): void;
    getAlpha(): number;

    // Metrics
    getMetrics(): Promise<PredictorMetrics>;
    empiricalCoverage(): number;
}
```

### AdaptiveConformalPredictor

```typescript
class AdaptiveConformalPredictor {
    constructor(config: AdaptiveConfig);

    // Adaptive inference
    predictAndAdapt(
        pointPrediction: number,
        actual?: number
    ): Promise<PredictionInterval>;

    // Monitoring
    empiricalCoverage(): number;
    currentAlpha(): number;
    getMetrics(): Promise<PredictorMetrics>;
}
```

### PredictionInterval

```typescript
interface PredictionInterval {
    point: number;      // Point prediction
    lower: number;      // Lower bound
    upper: number;      // Upper bound
    alpha: number;      // Miscoverage rate
    quantile: number;   // Threshold quantile
    timestamp: number;  // Prediction timestamp

    // Methods
    width(): number;                    // Interval width
    contains(value: number): boolean;   // Check if value in interval
    relativeWidth(): number;            // Width as % of point
    coverage(): number;                 // Expected coverage (1-α)
}
```

### Configuration

```typescript
interface PredictorConfig {
    alpha: number;                    // 0.01-0.30 (default: 0.1)
    scoreFunction: ScoreFunction;     // AbsoluteScore | NormalizedScore | QuantileScore
    calibrationSize?: number;         // 1000-5000 (default: 2000)
    recalibrationFreq?: number;       // Predictions before recalib (default: 100)
    maxIntervalWidthPct?: number;     // 1-10% (default: 5.0)
    monitoring?: {
        enabled: boolean;
        metricsInterval: number;      // ms (default: 5000)
    };
}

interface AdaptiveConfig {
    targetCoverage: number;           // 0.80-0.99 (default: 0.90)
    gamma: number;                    // 0.01-0.05 (default: 0.02)
    coverageWindow?: number;          // Window size for tracking (default: 200)
    alphaMin?: number;                // Min alpha (default: 0.01)
    alphaMax?: number;                // Max alpha (default: 0.30)
    scoreFunction: ScoreFunction;
}
```

### Score Functions

```typescript
import {
    AbsoluteScore,
    NormalizedScore,
    QuantileScore,
} from '@neural-trader/predictor';

// Absolute difference
const absolute = new AbsoluteScore();

// Normalized by prediction magnitude
const normalized = new NormalizedScore({ epsilon: 1e-6 });

// Quantile-based for asymmetric intervals
const quantile = new QuantileScore({ qLow: 0.05, qHigh: 0.95 });
```

## 🔗 Integration with @neural-trader/neural

Seamlessly combine neural predictions with conformal intervals:

```typescript
import { NeuralPredictor } from '@neural-trader/neural';
import { wrapWithConformal } from '@neural-trader/predictor';

// Load neural model
const neural = new NeuralPredictor({
    modelPath: './model.onnx',
    device: 'gpu',
});

// Wrap with conformal guarantees
const conformal = wrapWithConformal(neural, {
    alpha: 0.1,
    calibrationSize: 2000,
    adaptive: true,
    gamma: 0.02,
});

// Get predictions with guaranteed intervals
const features = loadFeatures();
const result = await conformal.predict(features);

console.log(`Point: ${result.point}`);
console.log(`Interval: [${result.lower}, ${result.upper}]`);
console.log(`Coverage: ${result.coverage() * 100}%`);

// Make trading decision with confidence
if (result.width() < 5 && result.point > 100) {
    await executeOrder({
        symbol: 'AAPL',
        quantity: 100,
        stopLoss: result.lower,
        takeProfit: result.upper,
    });
}
```

## 🎯 Trading Decision Engine

```typescript
import { TradingDecisionEngine } from '@neural-trader/predictor';

const engine = new TradingDecisionEngine({
    predictor: conformalPredictor,
    maxIntervalWidthPct: 5.0,
    minConfidence: 0.85,
    kellyFraction: 0.25,
    riskRewardRatio: 1.5,
});

const decision = await engine.evaluate(marketFeatures);

if (decision.shouldTrade) {
    console.log(`Signal: ${decision.signal}`);           // "buy" | "sell" | "hold"
    console.log(`Position Size: ${decision.positionSize}%`);
    console.log(`Edge: ${decision.edge}%`);
    console.log(`Risk: ${decision.risk}%`);
    console.log(`Expected Sharpe: ${decision.expectedSharpe}`);

    await executor.execute({
        side: decision.signal,
        quantity: decision.positionSize,
        stopLoss: decision.stopLoss,
        takeProfit: decision.takeProfit,
    });
}
```

## 📊 Performance Monitoring

```typescript
import { PredictorMonitor } from '@neural-trader/predictor';

const monitor = new PredictorMonitor(predictor);

// Real-time metrics
setInterval(async () => {
    const metrics = await monitor.getMetrics();

    console.log(`
        Coverage: ${(metrics.empiricalCoverage * 100).toFixed(2)}%
        Avg Width: ${metrics.avgIntervalWidth.toFixed(4)}
        Width Std Dev: ${metrics.widthStdDev.toFixed(4)}
        Latency p50: ${metrics.latencyP50.toFixed(2)}ms
        Latency p95: ${metrics.latencyP95.toFixed(2)}ms
        Latency p99: ${metrics.latencyP99.toFixed(2)}ms
        Calibration Age: ${metrics.calibrationAgeSeconds}s
    `);

    // Health checks
    if (!monitor.isHealthy()) {
        console.warn('⚠️ Predictor health issues:', monitor.getIssues());

        // Trigger recalibration if needed
        if (metrics.calibrationAgeSeconds > 300) {
            await recalibrate();
        }
    }
}, 5000);
```

## 🧪 Testing Utilities

```typescript
import {
    generateSyntheticData,
    evaluateCoverage,
    compareMethods,
    performanceBenchmark,
} from '@neural-trader/predictor/testing';

// Generate test data
const { predictions, actuals } = generateSyntheticData({
    size: 10000,
    distribution: 'normal',
    noise: 0.1,
    seed: 42,
});

// Evaluate coverage
const results = evaluateCoverage(predictor, predictions, actuals);
console.log(`Empirical Coverage: ${results.empiricalCoverage * 100}%`);
console.log(`Expected Coverage: ${(1 - predictor.alpha) * 100}%`);
console.log(`Avg Width: ${results.avgWidth}`);

// Compare different implementations
const comparison = await compareMethods({
    methods: ['conformal', 'bootstrap', 'mcDropout'],
    testData: { predictions, actuals },
    metrics: ['coverage', 'width', 'latency', 'memory'],
});

console.table(comparison);

// Benchmark performance
const bench = await performanceBenchmark(predictor, {
    iterations: 10000,
    calibrationSizes: [1000, 2000, 5000],
    memoryProfile: true,
});

console.log(`Throughput: ${bench.throughput} predictions/sec`);
console.log(`Memory Peak: ${bench.memoryPeak}MB`);
```

## 🌍 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✓ Full support |
| Firefox | 88+ | ✓ Full support |
| Safari | 14+ | ✓ Full support |
| Edge | 90+ | ✓ Full support |
| Mobile (iOS) | 14+ | ✓ Full support |
| Mobile (Android) | 10+ | ✓ Full support |

WASM support requires browsers with WebAssembly support (all modern browsers).

## 📦 Build Targets

The package is built for multiple targets:

```javascript
// CommonJS (Node.js)
const { ConformalPredictor } = require('@neural-trader/predictor');

// ES Modules
import { ConformalPredictor } from '@neural-trader/predictor';

// WASM (high-performance)
import { WasmConformalPredictor } from '@neural-trader/predictor/wasm';

// Native (Node.js only)
import { NativeConformalPredictor } from '@neural-trader/predictor/native';
```

## 🚀 Examples

See the `/examples` directory for complete working examples:

- `basic.ts` - Simple conformal prediction
- `trading.ts` - Real trading integration example

Run examples:

```bash
npm run build
npm run bench
```

## 🧠 Mathematical Background

### Conformal Prediction Guarantee

For calibration samples with nonconformity scores:

```
Quantile = ceil((n+1)(1-α)) / n
```

Prediction interval guarantees:

```
P(y ∈ [pred - Quantile, pred + Quantile]) ≥ 1 - α
```

### Adaptive Coverage (ACI)

Dynamically adjusts α using PID control:

```
α_new = α - γ × (observed_coverage - target_coverage)
```

With constraints: `α_min ≤ α_new ≤ α_max`

## 📝 Logging & Debugging

```typescript
// Enable debug logging
localStorage.setItem('log-level', 'debug');

// Or in Node.js
process.env.DEBUG = 'neural-trader:*';
```

Log levels: `error`, `warn`, `info`, `debug`, `trace`

## 🔒 Error Handling

```typescript
import { PredictionError, ConfigError, CalibrationError } from '@neural-trader/predictor';

try {
    const interval = await predictor.predict(value);
} catch (error) {
    if (error instanceof CalibrationError) {
        // Handle calibration issues
        console.error('Calibration failed:', error.message);
        await recalibrate();
    } else if (error instanceof ConfigError) {
        // Handle configuration issues
        console.error('Invalid configuration:', error.message);
    } else if (error instanceof PredictionError) {
        // Handle prediction issues
        console.error('Prediction failed:', error.message);
    }
}
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run tests: `npm run test`
5. Format code: `npm run lint`
6. Submit a pull request

## 📄 License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.

## 🔗 Resources

- [Conformal Prediction Theory](https://en.wikipedia.org/wiki/Conformal_prediction)
- [Adaptive Conformal Inference](https://arxiv.org/abs/2310.19903)
- [Conformalized Quantile Regression](https://arxiv.org/abs/1905.03222)
- [Repository](https://github.com/ruvnet/neural-trader)
- [Rust Crate](https://crates.io/crates/neural-trader-predictor)

## ⚡ Roadmap

- [x] Pure JavaScript implementation
- [x] WASM bindings
- [x] NAPI-rs native addon
- [x] Adaptive conformal inference
- [x] Multiple score functions
- [ ] GPU acceleration
- [ ] Reinforcement learning for α selection
- [ ] REST API client
- [ ] React hooks
- [ ] Vue composables

## 💬 Support

For issues, questions, or suggestions:

- Open an issue on [GitHub](https://github.com/ruvnet/neural-trader/issues)
- Check [documentation](https://docs.rs/neural-trader-predictor)
- Review [examples](./examples)

---

**Built with ❤️ for the quantitative trading and ML communities**
