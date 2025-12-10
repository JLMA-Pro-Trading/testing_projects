'use strict';

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/pure/types.ts
var PredictionIntervalImpl = class {
  constructor(point, lower, upper, alpha, quantile, timestamp = Date.now()) {
    this.point = point;
    this.lower = lower;
    this.upper = upper;
    this.alpha = alpha;
    this.quantile = quantile;
    this.timestamp = timestamp;
  }
  width() {
    return this.upper - this.lower;
  }
  contains(value) {
    return value >= this.lower && value <= this.upper;
  }
  relativeWidth() {
    if (Math.abs(this.point) < Number.EPSILON) {
      return Infinity;
    }
    return this.width() / Math.abs(this.point) * 100;
  }
  coverage() {
    return 1 - this.alpha;
  }
};
var defaultPredictorConfig = {
  alpha: 0.1,
  calibrationSize: 2e3,
  maxIntervalWidthPct: 5,
  recalibrationFreq: 100
};
var defaultAdaptiveConfig = {
  targetCoverage: 0.9,
  gamma: 0.02,
  coverageWindow: 200,
  alphaMin: 0.01,
  alphaMax: 0.3
};

// src/pure/scores.ts
var AbsoluteScore = class {
  score(prediction, actual) {
    return Math.abs(actual - prediction);
  }
  interval(prediction, quantile) {
    return [prediction - quantile, prediction + quantile];
  }
};
var NormalizedScore = class {
  constructor(stdDev = 1) {
    this.stdDev = stdDev;
  }
  score(prediction, actual) {
    return Math.abs(actual - prediction) / Math.max(this.stdDev, 1e-6);
  }
  interval(prediction, quantile) {
    const width = quantile * this.stdDev;
    return [prediction - width, prediction + width];
  }
  /** Update standard deviation estimate */
  updateStdDev(stdDev) {
    this.stdDev = Math.max(stdDev, 1e-6);
  }
};
var QuantileScore = class {
  constructor(alphaLow = 0.05, alphaHigh = 0.95) {
    if (alphaLow < 0 || alphaLow >= alphaHigh || alphaHigh > 1) {
      throw new Error("Invalid quantile values");
    }
  }
  score(prediction, actual) {
    const half = prediction * 0.05;
    return Math.max(prediction - half - actual, actual - (prediction + half));
  }
  interval(prediction, quantile) {
    return [prediction - quantile, prediction + quantile];
  }
  /**
   * Compute score for quantile predictions
   */
  scoreQuantiles(qLow, qHigh, actual) {
    return Math.max(qLow - actual, actual - qHigh);
  }
};

// src/pure/conformal.ts
var SplitConformalPredictor = class {
  constructor(config = {}, scoreFunction) {
    this.calibrationScores = [];
    this.quantile = 0;
    this.nCalibration = 0;
    this.predictionCount = 0;
    const fullConfig = { ...defaultPredictorConfig, ...config };
    this.alpha = fullConfig.alpha;
    this.calibrationSize = fullConfig.calibrationSize;
    this.recalibrationFreq = fullConfig.recalibrationFreq;
    this.scoreFunction = scoreFunction || new AbsoluteScore();
  }
  /**
   * Calibrate the predictor with historical data
   * O(n log n) due to sorting
   *
   * @param predictions - Model's point predictions
   * @param actuals - Actual observed values
   */
  async calibrate(predictions, actuals) {
    if (predictions.length !== actuals.length) {
      throw new Error("Predictions and actuals must have same length");
    }
    if (predictions.length === 0) {
      throw new Error("At least one calibration sample required");
    }
    const scores = [];
    for (let i = 0; i < predictions.length; i++) {
      const score = this.scoreFunction.score(predictions[i], actuals[i]);
      scores.push(score);
    }
    scores.sort((a, b) => a - b);
    this.calibrationScores = scores;
    this.nCalibration = scores.length;
    this.updateQuantile();
  }
  /**
   * Make a prediction with a confidence interval
   * O(1) time after calibration
   *
   * @param pointPrediction - Model's point prediction
   * @returns PredictionInterval with bounds
   */
  predict(pointPrediction) {
    if (this.nCalibration === 0) {
      throw new Error("Predictor not calibrated");
    }
    const [lower, upper] = this.scoreFunction.interval(pointPrediction, this.quantile);
    const interval = new PredictionIntervalImpl(
      pointPrediction,
      lower,
      upper,
      this.alpha,
      this.quantile
    );
    this.predictionCount++;
    return interval;
  }
  /**
   * Update predictor with new observation
   * O(log n) via binary search insertion
   *
   * @param prediction - Model's point prediction
   * @param actual - Actual observed value
   */
  async update(prediction, actual) {
    const score = this.scoreFunction.score(prediction, actual);
    const insertPos = this.binarySearchInsertPosition(score);
    this.calibrationScores.splice(insertPos, 0, score);
    if (this.calibrationScores.length > this.calibrationSize) {
      this.calibrationScores.shift();
    }
    this.nCalibration = this.calibrationScores.length;
    this.updateQuantile();
  }
  /**
   * Trigger full recalibration if needed
   */
  async recalibrate(predictions, actuals) {
    if (this.predictionCount % this.recalibrationFreq === 0) {
      await this.calibrate(predictions, actuals);
      this.predictionCount = 0;
    }
  }
  /**
   * Get empirical coverage from calibration set
   */
  getEmpiricalCoverage(predictions, actuals) {
    if (predictions.length === 0) return 0;
    let covered = 0;
    for (let i = 0; i < predictions.length; i++) {
      const interval = this.predict(predictions[i]);
      if (interval.contains(actuals[i])) {
        covered++;
      }
    }
    return covered / predictions.length;
  }
  /**
   * Get calibration statistics
   */
  getStats() {
    return {
      nCalibration: this.nCalibration,
      alpha: this.alpha,
      quantile: this.quantile,
      predictionCount: this.predictionCount,
      minScore: this.calibrationScores[0] ?? 0,
      maxScore: this.calibrationScores[this.nCalibration - 1] ?? 0
    };
  }
  /**
   * Update the quantile threshold based on sorted scores
   * Follows: q = ceil((n+1)(1-alpha))/n
   * @private
   */
  updateQuantile() {
    if (this.nCalibration === 0) {
      this.quantile = 0;
      return;
    }
    const index = Math.ceil((this.nCalibration + 1) * (1 - this.alpha)) - 1;
    const clampedIndex = Math.max(0, Math.min(index, this.nCalibration - 1));
    this.quantile = this.calibrationScores[clampedIndex];
  }
  /**
   * Find binary search insertion position
   * @private
   */
  binarySearchInsertPosition(score) {
    let left = 0;
    let right = this.calibrationScores.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.calibrationScores[mid] < score) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return left;
  }
};
var AdaptiveConformalPredictor = class {
  constructor(config = {}, scoreFunction) {
    this.coverageHistory = [];
    const fullConfig = { ...defaultAdaptiveConfig, ...config };
    this.targetCoverage = fullConfig.targetCoverage;
    this.gamma = fullConfig.gamma;
    this.coverageWindow = fullConfig.coverageWindow;
    this.alphaMin = fullConfig.alphaMin;
    this.alphaMax = fullConfig.alphaMax;
    this.scoreFunction = scoreFunction || new AbsoluteScore();
    this.alphaCurrent = 1 - this.targetCoverage;
    this.basePredictorConfig = {
      alpha: this.alphaCurrent
    };
    this.basePredictor = new SplitConformalPredictor(
      this.basePredictorConfig,
      this.scoreFunction
    );
  }
  /**
   * Initialize with calibration data
   *
   * @param predictions - Initial predictions for calibration
   * @param actuals - Actual values for calibration
   */
  async calibrate(predictions, actuals) {
    await this.basePredictor.calibrate(predictions, actuals);
  }
  /**
   * Make prediction and adapt alpha based on coverage
   * O(log n) with binary search
   *
   * @param pointPrediction - Model's point prediction
   * @param actual - Optional actual value for adaptation
   * @returns PredictionInterval
   */
  async predictAndAdapt(pointPrediction, actual) {
    const interval = this.basePredictor.predict(pointPrediction);
    if (actual !== void 0) {
      const covered = interval.contains(actual) ? 1 : 0;
      this.coverageHistory.push(covered);
      if (this.coverageHistory.length > this.coverageWindow) {
        this.coverageHistory.shift();
      }
      const empirical = this.empiricalCoverage();
      const error = this.targetCoverage - empirical;
      this.alphaCurrent -= this.gamma * error;
      this.alphaCurrent = Math.max(this.alphaMin, Math.min(this.alphaMax, this.alphaCurrent));
      const updatedConfig = { ...this.basePredictorConfig, alpha: this.alphaCurrent };
      this.basePredictor = new SplitConformalPredictor(updatedConfig, this.scoreFunction);
      await this.basePredictor.update(pointPrediction, actual);
    }
    return interval;
  }
  /**
   * Standard prediction without adaptation
   *
   * @param pointPrediction - Model's point prediction
   * @returns PredictionInterval
   */
  predict(pointPrediction) {
    return this.basePredictor.predict(pointPrediction);
  }
  /**
   * Update predictor with new observation
   *
   * @param prediction - Model's point prediction
   * @param actual - Actual observed value
   */
  async update(prediction, actual) {
    await this.basePredictor.update(prediction, actual);
  }
  /**
   * Compute empirical coverage from history
   * Simple average of coverage indicator in the window
   */
  empiricalCoverage() {
    if (this.coverageHistory.length === 0) {
      return this.targetCoverage;
    }
    const sum = this.coverageHistory.reduce((a, b) => a + b, 0);
    return sum / this.coverageHistory.length;
  }
  /**
   * Get current alpha value
   */
  getCurrentAlpha() {
    return this.alphaCurrent;
  }
  /**
   * Get statistics including coverage metrics
   */
  getStats() {
    const empirical = this.empiricalCoverage();
    return {
      ...this.basePredictor.getStats(),
      alphaCurrent: this.alphaCurrent,
      empiricalCoverage: empirical,
      targetCoverage: this.targetCoverage,
      coverageDifference: this.targetCoverage - empirical,
      coverageHistorySize: this.coverageHistory.length
    };
  }
};
var CQRPredictor = class {
  constructor(config = {}, alphaLow = 0.05, alphaHigh = 0.95, scoreFunction) {
    this.calibrationScores = [];
    this.quantile = 0;
    this.nCalibration = 0;
    if (alphaLow < 0 || alphaLow >= alphaHigh || alphaHigh > 1) {
      throw new Error("Invalid quantile values");
    }
    const fullConfig = { ...defaultPredictorConfig, ...config };
    this.alpha = fullConfig.alpha;
    this.calibrationSize = fullConfig.calibrationSize;
    this.scoreFunction = scoreFunction || new AbsoluteScore();
    this.alphaLow = alphaLow;
    this.alphaHigh = alphaHigh;
  }
  /**
   * Calibrate with quantile predictions
   *
   * @param qLow - Lower quantile predictions
   * @param qHigh - Upper quantile predictions
   * @param actuals - Actual observed values
   */
  async calibrate(qLow, qHigh, actuals) {
    if (qLow.length !== qHigh.length || qLow.length !== actuals.length) {
      throw new Error("All arrays must have same length");
    }
    if (qLow.length === 0) {
      throw new Error("At least one calibration sample required");
    }
    const scores = [];
    for (let i = 0; i < qLow.length; i++) {
      const score = Math.max(qLow[i] - actuals[i], actuals[i] - qHigh[i]);
      scores.push(score);
    }
    scores.sort((a, b) => a - b);
    this.calibrationScores = scores;
    this.nCalibration = scores.length;
    this.updateQuantile();
  }
  /**
   * Make CQR prediction with adjusted quantile bounds
   *
   * @param qLow - Lower quantile prediction from model
   * @param qHigh - Upper quantile prediction from model
   * @returns PredictionInterval with adjusted bounds
   */
  predict(qLow, qHigh) {
    if (this.nCalibration === 0) {
      throw new Error("Predictor not calibrated");
    }
    const lower = qLow - this.quantile;
    const upper = qHigh + this.quantile;
    const point = (qLow + qHigh) / 2;
    return new PredictionIntervalImpl(point, lower, upper, this.alpha, this.quantile);
  }
  /**
   * Update with new observation
   *
   * @param qLow - Lower quantile prediction
   * @param qHigh - Upper quantile prediction
   * @param actual - Actual observed value
   */
  async update(qLow, qHigh, actual) {
    const score = Math.max(qLow - actual, actual - qHigh);
    const insertPos = this.binarySearchInsertPosition(score);
    this.calibrationScores.splice(insertPos, 0, score);
    if (this.calibrationScores.length > this.calibrationSize) {
      this.calibrationScores.shift();
    }
    this.nCalibration = this.calibrationScores.length;
    this.updateQuantile();
  }
  /**
   * Get statistics
   */
  getStats() {
    return {
      nCalibration: this.nCalibration,
      alpha: this.alpha,
      alphaLow: this.alphaLow,
      alphaHigh: this.alphaHigh,
      quantile: this.quantile,
      minScore: this.calibrationScores[0] ?? 0,
      maxScore: this.calibrationScores[this.nCalibration - 1] ?? 0
    };
  }
  /**
   * Update quantile threshold
   * @private
   */
  updateQuantile() {
    if (this.nCalibration === 0) {
      this.quantile = 0;
      return;
    }
    const index = Math.ceil((this.nCalibration + 1) * (1 - this.alpha)) - 1;
    const clampedIndex = Math.max(0, Math.min(index, this.nCalibration - 1));
    this.quantile = this.calibrationScores[clampedIndex];
  }
  /**
   * Binary search insertion position
   * @private
   */
  binarySearchInsertPosition(score) {
    let left = 0;
    let right = this.calibrationScores.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.calibrationScores[mid] < score) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return left;
  }
};

// src/factory.ts
async function detectImplementations() {
  const available = /* @__PURE__ */ new Set();
  available.add("pure");
  try {
    if (typeof globalThis !== "undefined") {
    }
  } catch (e) {
  }
  try {
    const nativeModule = __require("@neural-trader/predictor-native");
    if (nativeModule) {
      available.add("native");
    }
  } catch (e) {
  }
  return available;
}
async function selectImplementation(options) {
  if (options.implementation && options.implementation !== "auto") {
    return options.implementation;
  }
  const available = await detectImplementations();
  if (options.preferNative && available.has("native")) {
    return "native";
  }
  if (options.fallbackToWasm && available.has("wasm")) {
    return "wasm";
  }
  if (available.has("native")) {
    return "native";
  }
  if (available.has("wasm")) {
    return "wasm";
  }
  return "pure";
}
async function createPredictor(config = {}, scoreFunction) {
  const implementation = await selectImplementation(config);
  let predictor;
  if (implementation === "native") {
    try {
      const { NativeConformalPredictor } = await lazyLoadNative();
      predictor = new NativeConformalPredictor(
        { alpha: config.alpha },
        scoreFunction
      );
      return { predictor, type: "native" };
    } catch (e) {
      console.warn("Failed to load native implementation, falling back to WASM", e);
    }
  }
  if (implementation === "wasm" || implementation === "native") {
    try {
      const { WasmConformalPredictor } = await lazyLoadWasm();
      predictor = new WasmConformalPredictor(
        { alpha: config.alpha },
        scoreFunction
      );
      return { predictor, type: "wasm" };
    } catch (e) {
      console.warn("Failed to load WASM implementation, falling back to pure JS", e);
    }
  }
  predictor = new SplitConformalPredictor(
    { alpha: config.alpha },
    scoreFunction
  );
  return { predictor, type: "pure" };
}
async function createAdaptivePredictor(config = {}, scoreFunction) {
  const implementation = await selectImplementation(config);
  let predictor;
  if (implementation === "native") {
    try {
      const { NativeAdaptiveConformalPredictor } = await lazyLoadNative();
      predictor = new NativeAdaptiveConformalPredictor(
        {
          targetCoverage: config.targetCoverage,
          gamma: config.gamma
        },
        scoreFunction
      );
      return { predictor, type: "native" };
    } catch (e) {
      console.warn("Failed to load native implementation, falling back to WASM", e);
    }
  }
  if (implementation === "wasm" || implementation === "native") {
    try {
      const { WasmAdaptiveConformalPredictor } = await lazyLoadWasm();
      predictor = new WasmAdaptiveConformalPredictor(
        {
          targetCoverage: config.targetCoverage,
          gamma: config.gamma
        },
        scoreFunction
      );
      return { predictor, type: "wasm" };
    } catch (e) {
      console.warn("Failed to load WASM implementation, falling back to pure JS", e);
    }
  }
  predictor = new AdaptiveConformalPredictor(
    {
      targetCoverage: config.targetCoverage,
      gamma: config.gamma
    },
    scoreFunction
  );
  return { predictor, type: "pure" };
}
async function lazyLoadNative() {
  if (typeof globalThis !== "undefined" && typeof __require !== "undefined") {
    try {
      return await import('@neural-trader/predictor-native');
    } catch (e) {
      throw new Error("Native implementation not available");
    }
  }
  throw new Error("Native implementation not available in this environment");
}
async function lazyLoadWasm() {
  try {
    if (typeof globalThis !== "undefined") {
      const wasmModule = await import('../wasm-pkg/index.js');
      return wasmModule;
    }
    throw new Error("WASM not available in this environment");
  } catch (e) {
    throw new Error("WASM implementation not available");
  }
}
async function detectAvailableImplementations() {
  const available = await detectImplementations();
  return Array.from(available);
}
function getImplementationInfo(type) {
  const info = {
    native: {
      name: "Native (NAPI-rs)",
      description: "High-performance Rust implementation via Node.js native addon",
      performance: "~1x (baseline, fastest)"
    },
    wasm: {
      name: "WebAssembly (Rust compiled to WASM)",
      description: "Good performance with smaller bundle size than native",
      performance: "~1-2x slower than native"
    },
    pure: {
      name: "Pure TypeScript",
      description: "Pure JavaScript implementation with no external dependencies",
      performance: "~5-10x slower than native"
    }
  };
  return info[type];
}

exports.AbsoluteScore = AbsoluteScore;
exports.AdaptiveConformalPredictor = AdaptiveConformalPredictor;
exports.CQRPredictor = CQRPredictor;
exports.NormalizedScore = NormalizedScore;
exports.PredictionIntervalImpl = PredictionIntervalImpl;
exports.QuantileScore = QuantileScore;
exports.SplitConformalPredictor = SplitConformalPredictor;
exports.createAdaptivePredictor = createAdaptivePredictor;
exports.createPredictor = createPredictor;
exports.defaultAdaptiveConfig = defaultAdaptiveConfig;
exports.defaultPredictorConfig = defaultPredictorConfig;
exports.detectAvailableImplementations = detectAvailableImplementations;
exports.getImplementationInfo = getImplementationInfo;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map