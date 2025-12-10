/**
 * Core types for conformal prediction
 */
interface PredictionInterval {
    /** Point prediction from base model */
    point: number;
    /** Lower bound of prediction interval */
    lower: number;
    /** Upper bound of prediction interval */
    upper: number;
    /** Miscoverage rate (1 - coverage) */
    alpha: number;
    /** Computed quantile threshold */
    quantile: number;
    /** Timestamp of prediction */
    timestamp: number;
    /** Width of the interval */
    width(): number;
    /** Check if value is in interval */
    contains(value: number): boolean;
    /** Relative width as percentage */
    relativeWidth(): number;
    /** Expected coverage (1 - alpha) */
    coverage(): number;
}
declare class PredictionIntervalImpl implements PredictionInterval {
    point: number;
    lower: number;
    upper: number;
    alpha: number;
    quantile: number;
    timestamp: number;
    constructor(point: number, lower: number, upper: number, alpha: number, quantile: number, timestamp?: number);
    width(): number;
    contains(value: number): boolean;
    relativeWidth(): number;
    coverage(): number;
}
interface PredictorConfig {
    /** Miscoverage rate (e.g., 0.1 for 90% coverage) */
    alpha: number;
    /** Maximum calibration set size */
    calibrationSize?: number;
    /** Maximum interval width as percentage */
    maxIntervalWidthPct?: number;
    /** Recalibration frequency (number of predictions) */
    recalibrationFreq?: number;
}
interface AdaptiveConfig {
    /** Target coverage (e.g., 0.90 for 90%) */
    targetCoverage: number;
    /** Learning rate for PID control */
    gamma: number;
    /** Window size for coverage tracking */
    coverageWindow?: number;
    /** Minimum alpha value */
    alphaMin?: number;
    /** Maximum alpha value */
    alphaMax?: number;
}
declare const defaultPredictorConfig: Required<PredictorConfig>;
declare const defaultAdaptiveConfig: Required<AdaptiveConfig>;

/**
 * Nonconformity score functions
 */
interface NonconformityScore {
    /** Compute nonconformity score */
    score(prediction: number, actual: number): number;
    /** Compute prediction interval given quantile */
    interval(prediction: number, quantile: number): [number, number];
}
/**
 * Absolute residual score: |actual - prediction|
 */
declare class AbsoluteScore implements NonconformityScore {
    score(prediction: number, actual: number): number;
    interval(prediction: number, quantile: number): [number, number];
}
/**
 * Normalized score: residual divided by model uncertainty
 */
declare class NormalizedScore implements NonconformityScore {
    private stdDev;
    constructor(stdDev?: number);
    score(prediction: number, actual: number): number;
    interval(prediction: number, quantile: number): [number, number];
    /** Update standard deviation estimate */
    updateStdDev(stdDev: number): void;
}
/**
 * Quantile-based score for CQR
 */
declare class QuantileScore implements NonconformityScore {
    constructor(alphaLow?: number, alphaHigh?: number);
    score(prediction: number, actual: number): number;
    interval(prediction: number, quantile: number): [number, number];
    /**
     * Compute score for quantile predictions
     */
    scoreQuantiles(qLow: number, qHigh: number, actual: number): number;
}

/**
 * Pure TypeScript implementation of conformal prediction algorithms
 * Ports Rust algorithms with efficient sorting and binary search
 */

/**
 * Split Conformal Predictor
 * Provides distribution-free prediction intervals with guaranteed coverage
 *
 * Mathematical guarantee: P(y ∈ [lower, upper]) ≥ 1 - α
 */
declare class SplitConformalPredictor {
    private alpha;
    private calibrationSize;
    private recalibrationFreq;
    private scoreFunction;
    private calibrationScores;
    private quantile;
    private nCalibration;
    private predictionCount;
    constructor(config?: Partial<PredictorConfig>, scoreFunction?: NonconformityScore);
    /**
     * Calibrate the predictor with historical data
     * O(n log n) due to sorting
     *
     * @param predictions - Model's point predictions
     * @param actuals - Actual observed values
     */
    calibrate(predictions: number[], actuals: number[]): Promise<void>;
    /**
     * Make a prediction with a confidence interval
     * O(1) time after calibration
     *
     * @param pointPrediction - Model's point prediction
     * @returns PredictionInterval with bounds
     */
    predict(pointPrediction: number): PredictionInterval;
    /**
     * Update predictor with new observation
     * O(log n) via binary search insertion
     *
     * @param prediction - Model's point prediction
     * @param actual - Actual observed value
     */
    update(prediction: number, actual: number): Promise<void>;
    /**
     * Trigger full recalibration if needed
     */
    recalibrate(predictions: number[], actuals: number[]): Promise<void>;
    /**
     * Get empirical coverage from calibration set
     */
    getEmpiricalCoverage(predictions: number[], actuals: number[]): number;
    /**
     * Get calibration statistics
     */
    getStats(): {
        nCalibration: number;
        alpha: number;
        quantile: number;
        predictionCount: number;
        minScore: number;
        maxScore: number;
    };
    /**
     * Update the quantile threshold based on sorted scores
     * Follows: q = ceil((n+1)(1-alpha))/n
     * @private
     */
    private updateQuantile;
    /**
     * Find binary search insertion position
     * @private
     */
    private binarySearchInsertPosition;
}
/**
 * Adaptive Conformal Inference (ACI)
 * Dynamically adjusts alpha using PID control to track target coverage
 *
 * Maintains empirical coverage close to target by adapting alpha during streaming
 */
declare class AdaptiveConformalPredictor {
    private targetCoverage;
    private gamma;
    private coverageWindow;
    private alphaMin;
    private alphaMax;
    private basePredictorConfig;
    private basePredictor;
    private scoreFunction;
    private coverageHistory;
    private alphaCurrent;
    constructor(config?: Partial<AdaptiveConfig>, scoreFunction?: NonconformityScore);
    /**
     * Initialize with calibration data
     *
     * @param predictions - Initial predictions for calibration
     * @param actuals - Actual values for calibration
     */
    calibrate(predictions: number[], actuals: number[]): Promise<void>;
    /**
     * Make prediction and adapt alpha based on coverage
     * O(log n) with binary search
     *
     * @param pointPrediction - Model's point prediction
     * @param actual - Optional actual value for adaptation
     * @returns PredictionInterval
     */
    predictAndAdapt(pointPrediction: number, actual?: number): Promise<PredictionInterval>;
    /**
     * Standard prediction without adaptation
     *
     * @param pointPrediction - Model's point prediction
     * @returns PredictionInterval
     */
    predict(pointPrediction: number): PredictionInterval;
    /**
     * Update predictor with new observation
     *
     * @param prediction - Model's point prediction
     * @param actual - Actual observed value
     */
    update(prediction: number, actual: number): Promise<void>;
    /**
     * Compute empirical coverage from history
     * Simple average of coverage indicator in the window
     */
    empiricalCoverage(): number;
    /**
     * Get current alpha value
     */
    getCurrentAlpha(): number;
    /**
     * Get statistics including coverage metrics
     */
    getStats(): {
        alphaCurrent: number;
        empiricalCoverage: number;
        targetCoverage: number;
        coverageDifference: number;
        coverageHistorySize: number;
        nCalibration: number;
        alpha: number;
        quantile: number;
        predictionCount: number;
        minScore: number;
        maxScore: number;
    };
}
/**
 * Conformalized Quantile Regression (CQR) Predictor
 * Uses quantile predictions from model for prediction intervals
 */
declare class CQRPredictor {
    private alpha;
    private calibrationSize;
    private scoreFunction;
    private calibrationScores;
    private quantile;
    private nCalibration;
    private alphaLow;
    private alphaHigh;
    constructor(config?: Partial<PredictorConfig>, alphaLow?: number, alphaHigh?: number, scoreFunction?: NonconformityScore);
    /**
     * Calibrate with quantile predictions
     *
     * @param qLow - Lower quantile predictions
     * @param qHigh - Upper quantile predictions
     * @param actuals - Actual observed values
     */
    calibrate(qLow: number[], qHigh: number[], actuals: number[]): Promise<void>;
    /**
     * Make CQR prediction with adjusted quantile bounds
     *
     * @param qLow - Lower quantile prediction from model
     * @param qHigh - Upper quantile prediction from model
     * @returns PredictionInterval with adjusted bounds
     */
    predict(qLow: number, qHigh: number): PredictionInterval;
    /**
     * Update with new observation
     *
     * @param qLow - Lower quantile prediction
     * @param qHigh - Upper quantile prediction
     * @param actual - Actual observed value
     */
    update(qLow: number, qHigh: number, actual: number): Promise<void>;
    /**
     * Get statistics
     */
    getStats(): {
        nCalibration: number;
        alpha: number;
        alphaLow: number;
        alphaHigh: number;
        quantile: number;
        minScore: number;
        maxScore: number;
    };
    /**
     * Update quantile threshold
     * @private
     */
    private updateQuantile;
    /**
     * Binary search insertion position
     * @private
     */
    private binarySearchInsertPosition;
}

/**
 * Factory pattern for automatic implementation selection
 * Detects and uses best available implementation: native > WASM > pure JS
 */

type ImplementationType = 'native' | 'wasm' | 'pure';
interface PredictorImplementation {
    type: ImplementationType;
    predictor: SplitConformalPredictor | AdaptiveConformalPredictor;
}
/**
 * Factory configuration options
 */
interface FactoryConfig {
    alpha?: number;
    scoreFunction?: NonconformityScore;
    implementation?: 'auto' | 'native' | 'wasm' | 'pure';
    preferNative?: boolean;
    fallbackToWasm?: boolean;
    fallbackToPure?: boolean;
}
interface AdaptiveFactoryConfig extends FactoryConfig {
    targetCoverage?: number;
    gamma?: number;
}
/**
 * Create a SplitConformalPredictor with automatic implementation selection
 *
 * Automatically detects and uses the best available implementation:
 * - Native (NAPI-rs): Fastest, requires compilation
 * - WASM: Good performance, smaller bundle size (requires wasm-pack)
 * - Pure JS: Always available, works everywhere
 *
 * @param config - Configuration options
 * @param scoreFunction - Nonconformity score function
 * @returns Promise resolving to predictor and implementation type
 *
 * @example
 * ```typescript
 * const { predictor, type } = await createPredictor({
 *   alpha: 0.1,
 *   preferNative: true,
 * });
 *
 * console.log(`Using ${type} implementation`);
 * await predictor.calibrate(predictions, actuals);
 * ```
 */
declare function createPredictor(config?: FactoryConfig, scoreFunction?: NonconformityScore): Promise<{
    predictor: SplitConformalPredictor;
    type: ImplementationType;
}>;
/**
 * Create an AdaptiveConformalPredictor with automatic implementation selection
 *
 * Same as createPredictor but for adaptive variant
 *
 * @param config - Configuration options
 * @param scoreFunction - Nonconformity score function
 * @returns Promise resolving to adaptive predictor and implementation type
 */
declare function createAdaptivePredictor(config?: AdaptiveFactoryConfig, scoreFunction?: NonconformityScore): Promise<{
    predictor: AdaptiveConformalPredictor;
    type: ImplementationType;
}>;
/**
 * Detect current implementation type
 * Useful for logging and debugging
 *
 * @returns Promise resolving to available implementation types
 *
 * @example
 * ```typescript
 * const available = await detectAvailableImplementations();
 * console.log('Available implementations:', available);
 * ```
 */
declare function detectAvailableImplementations(): Promise<ImplementationType[]>;
/**
 * Get implementation information
 * @internal
 */
declare function getImplementationInfo(type: ImplementationType): {
    name: string;
    description: string;
    performance: string;
};

export { AbsoluteScore, type AdaptiveConfig, AdaptiveConformalPredictor, type AdaptiveFactoryConfig, CQRPredictor, type FactoryConfig, type ImplementationType, type NonconformityScore, NormalizedScore, type PredictionInterval, PredictionIntervalImpl, type PredictorConfig, type PredictorImplementation, QuantileScore, SplitConformalPredictor, createAdaptivePredictor, createPredictor, defaultAdaptiveConfig, defaultPredictorConfig, detectAvailableImplementations, getImplementationInfo };
