/**
 * Debug: Test ML predictions with real BTCUSDT data
 */

const core = require('@neural-trader/core');
const { NeuralModel, calculateRsi, calculateSma } = core;

const MODEL_CONFIG = {
  modelType: 'lstm_attention',
  inputSize: 20,
  horizon: 1,
  hiddenSize: 64,
  numLayers: 2,
  dropout: 0.2,
  learningRate: 0.001
};

function extractFeatures(candles, index) {
  if (index < 50) return null;

  const window = candles.slice(index - 50, index + 1);
  const closes = window.map(c => c.close);
  const volumes = window.map(c => c.volume);

  const features = [];
  const currentClose = closes[closes.length - 1];

  // Returns at different horizons (6 features)
  for (const period of [1, 2, 5, 10, 20, 50]) {
    if (closes.length > period) {
      features.push((currentClose - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]);
    } else {
      features.push(0);
    }
  }

  // RSI normalized (1 feature)
  const rsi = calculateRsi(closes, 14);
  features.push((rsi[rsi.length - 1] || 50) / 100);

  // SMA ratios (3 features)
  const sma10 = calculateSma(closes, 10);
  const sma20 = calculateSma(closes, 20);
  const sma50 = calculateSma(closes, 50);
  features.push(currentClose / (sma10[sma10.length - 1] || currentClose) - 1);
  features.push(currentClose / (sma20[sma20.length - 1] || currentClose) - 1);
  features.push(currentClose / (sma50[sma50.length - 1] || currentClose) - 1);

  // Volatility (2 features)
  const returns = [];
  for (let i = 1; i < Math.min(21, closes.length); i++) {
    returns.push((closes[closes.length - i] - closes[closes.length - i - 1]) / closes[closes.length - i - 1]);
  }
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length);
  features.push(stdReturn);
  features.push(meanReturn);

  // Volume ratio (2 features)
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const avgVol5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  features.push(volumes[volumes.length - 1] / avgVol - 1);
  features.push(avgVol5 / avgVol - 1);

  // Pad to 20 features
  while (features.length < 20) {
    features.push(0);
  }

  return features.slice(0, 20);
}

// Generate realistic BTCUSDT-like price data
function generateCandles(count, startPrice = 100000) {
  const candles = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    // Random walk with momentum and mean reversion
    const momentum = i > 0 ? (price - candles[i-1]?.close || 0) * 0.3 : 0;
    const meanReversion = (startPrice - price) * 0.01;
    const noise = (Math.random() - 0.5) * price * 0.02; // 2% max move

    price = price + momentum + meanReversion + noise;
    price = Math.max(price, startPrice * 0.8); // Floor

    const volatility = price * 0.005;
    const open = price + (Math.random() - 0.5) * volatility;
    const close = price + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = 1000 + Math.random() * 5000;

    candles.push({
      timestamp: Date.now() - (count - i) * 3600000,
      open, high, low, close, volume
    });

    price = close;
  }
  return candles;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔬 DEBUG: ML Prediction Analysis');
  console.log('═'.repeat(60));

  // Generate sample data (similar to BTCUSDT)
  console.log('\n📊 Generating sample price data...');
  const candles = generateCandles(500, 100000);

  console.log(`   Fetched ${candles.length} candles`);

  // Prepare training data
  const features = [];
  const targets = [];

  for (let i = 50; i < candles.length - 1; i++) {
    const feat = extractFeatures(candles, i);
    if (feat) {
      features.push(...feat);
      const futureReturn = (candles[i + 1].close - candles[i].close) / candles[i].close;
      targets.push(futureReturn);
    }
  }

  console.log(`\n📊 Training data:`);
  console.log(`   Samples: ${targets.length}`);
  console.log(`   Target range: [${(Math.min(...targets) * 100).toFixed(3)}%, ${(Math.max(...targets) * 100).toFixed(3)}%]`);
  console.log(`   Target mean: ${(targets.reduce((a,b)=>a+b,0)/targets.length * 100).toFixed(4)}%`);
  console.log(`   Target std: ${(Math.sqrt(targets.reduce((a,b)=>a+b*b,0)/targets.length) * 100).toFixed(4)}%`);

  // Train model
  console.log('\n🧠 Training model...');
  const model = new NeuralModel(MODEL_CONFIG);
  const metrics = await model.train(features, targets, {
    epochs: 30,
    batchSize: 32,
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    useGpu: false
  });

  console.log(`   Final loss: ${metrics[metrics.length-1].trainLoss.toFixed(4)}`);

  // Test predictions on different samples
  console.log('\n🔮 Testing predictions:');

  const testIndices = [
    candles.length - 1,  // Most recent
    candles.length - 10,
    candles.length - 50,
    candles.length - 100
  ];

  for (const idx of testIndices) {
    if (idx >= 50) {
      const feat = extractFeatures(candles, idx);
      const result = await model.predict(feat);
      console.log(`   Index ${idx}:`);
      console.log(`      Price: $${candles[idx].close.toFixed(2)}`);
      console.log(`      Features sample: [${feat.slice(0, 5).map(f => f.toFixed(4)).join(', ')}...]`);
      console.log(`      Prediction: ${(result.predictions[0] * 100).toFixed(4)}%`);
      console.log(`      Bounds: [${(result.lowerBound[0] * 100).toFixed(4)}%, ${(result.upperBound[0] * 100).toFixed(4)}%]`);
      console.log(`      Raw prediction: ${result.predictions[0]}`);
    }
  }

  // Compare actual vs predicted for historical data
  console.log('\n📈 Backtesting predictions (last 20 candles):');
  let correct = 0;
  let total = 0;

  for (let i = candles.length - 21; i < candles.length - 1; i++) {
    const feat = extractFeatures(candles, i);
    if (feat) {
      const result = await model.predict(feat);
      const predicted = result.predictions[0];
      const actual = (candles[i + 1].close - candles[i].close) / candles[i].close;

      // Direction accuracy
      if ((predicted > 0 && actual > 0) || (predicted < 0 && actual < 0) || (predicted === 0 && Math.abs(actual) < 0.001)) {
        correct++;
      }
      total++;

      if (i >= candles.length - 6) {  // Show last 5
        console.log(`   Candle ${i}: Pred=${(predicted*100).toFixed(3)}%, Actual=${(actual*100).toFixed(3)}%, ${predicted * actual > 0 ? '✓' : '✗'}`);
      }
    }
  }

  console.log(`\n   Direction Accuracy: ${(correct/total*100).toFixed(1)}% (${correct}/${total})`);

  console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);
