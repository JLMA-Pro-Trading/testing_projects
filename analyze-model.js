/**
 * Analyze why the ML model isn't working
 */
const core = require('@neural-trader/core');
const { calculateRsi, calculateSma } = core;
const config = require('./config.json');
const {
  DataPreprocessor,
  trainRidgeRegression,
  trainElasticNet,
  selectFeaturesByCorrelation,
  trainWeightedEnsemble
} = require('./src/regression');

const WINDOW_SIZE = 15;
const INTERVAL = '1m';

function curlFetch(url) {
  const { execSync } = require('child_process');
  const result = execSync(`curl -s --connect-timeout 15 "${url}"`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(result);
}

function extractFeatures(candles, index) {
  const minWindow = WINDOW_SIZE;
  if (index < minWindow) return null;

  const window = candles.slice(index - minWindow, index + 1);
  const closes = window.map(c => c.close);
  const volumes = window.map(c => c.volume);
  const highs = window.map(c => c.high);
  const lows = window.map(c => c.low);

  const features = [];
  const currentClose = closes[closes.length - 1];

  // Returns at different horizons
  const returnPeriods = [1, 2, 3, 5, 10, 15];
  for (const period of returnPeriods) {
    if (closes.length > period) {
      features.push((currentClose - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]);
    } else {
      features.push(0);
    }
  }

  // RSI normalized
  const rsi = calculateRsi(closes, Math.min(7, closes.length - 1));
  features.push((rsi[rsi.length - 1] || 50) / 100);

  // SMA ratios
  for (const p of [3, 5, 10]) {
    const sma = calculateSma(closes, Math.min(p, closes.length));
    features.push(currentClose / (sma[sma.length - 1] || currentClose) - 1);
  }

  // Volatility
  const returns = [];
  for (let i = 1; i < Math.min(minWindow, closes.length); i++) {
    returns.push((closes[closes.length - i] - closes[closes.length - i - 1]) / closes[closes.length - i - 1]);
  }
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdReturn = returns.length > 0 ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length) : 0;
  features.push(stdReturn);
  features.push(meanReturn);

  // Fill to 20
  while (features.length < 20) features.push(0);
  return features.slice(0, 20);
}

async function analyze() {
  console.log('🔬 ANALYZING ML MODEL PERFORMANCE\n');

  // Fetch data
  const url = 'https://testnet.binancefuture.com/fapi/v1/klines?symbol=BTCUSDT&interval=1m&limit=1000';
  const rawData = curlFetch(url);
  const candles = rawData.map(d => ({
    timestamp: d[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5])
  }));

  console.log(`Loaded ${candles.length} candles\n`);

  // Prepare features and targets
  const featuresList = [];
  const targets = [];
  const horizon = 5;

  for (let i = WINDOW_SIZE; i < candles.length - horizon; i++) {
    const feat = extractFeatures(candles, i);
    if (feat) {
      featuresList.push(feat);
      const futureReturn = (candles[i + horizon].close - candles[i].close) / candles[i].close;
      targets.push(futureReturn);
    }
  }

  console.log(`Samples: ${targets.length}`);

  // Train/test split
  const splitIdx = Math.floor(featuresList.length * 0.7);
  const trainX = featuresList.slice(0, splitIdx);
  const trainY = targets.slice(0, splitIdx);
  const testX = featuresList.slice(splitIdx);
  const testY = targets.slice(splitIdx);

  console.log(`Train: ${trainX.length}, Test: ${testX.length}\n`);

  // Normalize
  const preprocessor = new DataPreprocessor();
  preprocessor.fit(trainX);
  const trainXNorm = preprocessor.transform(trainX);
  const testXNorm = preprocessor.transform(testX);

  // Train model
  const selectedFeatures = selectFeaturesByCorrelation(trainXNorm, trainY, 10);
  const trainXSelected = trainXNorm.map(row => selectedFeatures.map(idx => row[idx]));
  const testXSelected = testXNorm.map(row => selectedFeatures.map(idx => row[idx]));

  const ensemble = trainWeightedEnsemble(trainXSelected, trainY, [
    { fn: trainRidgeRegression, lambda: 0.01, weight: 0.5 },
    { fn: trainElasticNet, lambda: 0.05, weight: 0.5 }
  ]);

  // Evaluate predictions
  const predictions = testXSelected.map(x => ensemble.predict(x));

  // Check prediction statistics
  const avgPred = predictions.reduce((a,b) => a+b, 0) / predictions.length;
  const maxPred = Math.max(...predictions);
  const minPred = Math.min(...predictions);
  const avgAbsPred = predictions.map(p => Math.abs(p)).reduce((a,b) => a+b, 0) / predictions.length;

  console.log('📊 PREDICTION STATISTICS:');
  console.log(`   Avg Prediction: ${(avgPred * 100).toFixed(6)}%`);
  console.log(`   Avg |Prediction|: ${(avgAbsPred * 100).toFixed(6)}%`);
  console.log(`   Max Prediction: ${(maxPred * 100).toFixed(4)}%`);
  console.log(`   Min Prediction: ${(minPred * 100).toFixed(4)}%`);

  // Check actual target statistics
  const avgTarget = testY.reduce((a,b) => a+b, 0) / testY.length;
  const avgAbsTarget = testY.map(t => Math.abs(t)).reduce((a,b) => a+b, 0) / testY.length;

  console.log('\n📊 ACTUAL RETURN STATISTICS:');
  console.log(`   Avg Actual Return: ${(avgTarget * 100).toFixed(6)}%`);
  console.log(`   Avg |Actual Return|: ${(avgAbsTarget * 100).toFixed(6)}%`);

  // Direction accuracy
  let correct = 0;
  let total = 0;
  for (let i = 0; i < predictions.length; i++) {
    const predDir = predictions[i] > 0 ? 1 : -1;
    const actualDir = testY[i] > 0 ? 1 : -1;
    if (predDir === actualDir) correct++;
    total++;
  }

  console.log('\n📊 DIRECTION ACCURACY:');
  console.log(`   Correct: ${correct} / ${total} = ${(correct/total*100).toFixed(1)}%`);

  // Correlation between predictions and actuals
  const meanP = predictions.reduce((a,b) => a+b, 0) / predictions.length;
  const meanT = testY.reduce((a,b) => a+b, 0) / testY.length;
  let cov = 0, varP = 0, varT = 0;
  for (let i = 0; i < predictions.length; i++) {
    cov += (predictions[i] - meanP) * (testY[i] - meanT);
    varP += Math.pow(predictions[i] - meanP, 2);
    varT += Math.pow(testY[i] - meanT, 2);
  }
  const correlation = cov / Math.sqrt(varP * varT);

  console.log(`   Correlation: ${correlation.toFixed(4)}`);

  // The real problem
  console.log('\n' + '═'.repeat(50));
  console.log('🚨 ROOT CAUSE ANALYSIS:');
  console.log('═'.repeat(50));

  if (Math.abs(correlation) < 0.1) {
    console.log('\n❌ CORRELATION IS NEAR ZERO');
    console.log('   The model has NO predictive power.');
    console.log('   Predictions are essentially random.');
  }

  if (correct/total < 0.52) {
    console.log('\n❌ DIRECTION ACCURACY IS ~50% (RANDOM)');
    console.log('   Linear regression cannot capture');
    console.log('   non-linear patterns in 1-min crypto data.');
  }

  console.log('\n💡 SOLUTIONS:');
  console.log('   1. Use longer timeframe (15m, 1h) - less noise');
  console.log('   2. Use non-linear models (XGBoost, LSTM)');
  console.log('   3. Add more features (order book, funding rate)');
  console.log('   4. Use trend-following instead of prediction');
  console.log('   5. Focus on mean-reversion only (RSI extremes)');
}

analyze().catch(console.error);
