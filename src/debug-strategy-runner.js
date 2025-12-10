/**
 * Test StrategyRunner with built-in strategies
 */

const core = require('@neural-trader/core');
const { StrategyRunner, NeuralModel, BatchPredictor } = core;

async function main() {
  console.log('═'.repeat(60));
  console.log('🔬 Testing StrategyRunner with Built-in Strategies');
  console.log('═'.repeat(60));

  const sr = new StrategyRunner();

  // Try adding mean reversion strategy
  console.log('\n1️⃣ Adding Mean Reversion Strategy:');
  try {
    sr.addMeanReversionStrategy({
      name: 'mean_rev_btc',
      symbols: ['BTCUSDT'],
      parameters: JSON.stringify({
        timeframe: '1h',
        lookbackPeriod: 20,
        entryThreshold: 2.0,
        exitThreshold: 0.5
      })
    });
    console.log('   ✅ Strategy added!');
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // Try adding momentum strategy
  console.log('\n2️⃣ Adding Momentum Strategy:');
  try {
    sr.addMomentumStrategy({
      name: 'momentum_btc',
      symbols: ['BTCUSDT'],
      parameters: JSON.stringify({
        timeframe: '1h',
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9
      })
    });
    console.log('   ✅ Strategy added!');
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // List strategies
  console.log('\n3️⃣ List strategies:');
  try {
    const strategies = sr.listStrategies();
    console.log('   Strategies:', strategies);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // Generate signals
  console.log('\n4️⃣ Generate signals:');

  // Create sample OHLCV data
  const bars = [];
  let price = 100000;
  for (let i = 0; i < 100; i++) {
    const change = (Math.random() - 0.5) * 1000;
    price += change;
    bars.push({
      timestamp: Date.now() - (100 - i) * 3600000,
      open: price,
      high: price + Math.random() * 500,
      low: price - Math.random() * 500,
      close: price + (Math.random() - 0.5) * 200,
      volume: 1000 + Math.random() * 5000
    });
  }

  try {
    const signals = sr.generateSignals(bars);
    console.log('   Signals type:', typeof signals);
    console.log('   Signals:', JSON.stringify(signals, null, 2));
  } catch (e) {
    console.log('   Error:', e.message);

    // Try with flat array format
    console.log('\n   Trying flat array format...');
    try {
      const flatBars = bars.map(b => [b.timestamp, b.open, b.high, b.low, b.close, b.volume]).flat();
      const signals = sr.generateSignals(flatBars);
      console.log('   Signals:', signals);
    } catch (e2) {
      console.log('   Error:', e2.message);
    }
  }

  // Test BatchPredictor with NeuralModel
  console.log('\n5️⃣ Testing BatchPredictor:');
  const bp = new BatchPredictor();

  console.log('   Adding model...');
  try {
    const model = new NeuralModel({
      modelType: 'lstm_attention',
      inputSize: 5,
      horizon: 1,
      hiddenSize: 32,
      numLayers: 2,
      dropout: 0.2,
      learningRate: 0.001
    });

    // Train the model first
    const features = [];
    const targets = [];
    for (let i = 0; i < 50; i++) {
      for (let j = 0; j < 5; j++) features.push(Math.random());
      targets.push(Math.random() > 0.5 ? 1 : -1);
    }

    await model.train(features, targets, {
      epochs: 10,
      batchSize: 8,
      validationSplit: 0.2,
      earlyStoppingPatience: 5,
      useGpu: false
    });

    bp.addModel('test_model', model);
    console.log('   ✅ Model added!');

    // Try batch prediction
    console.log('\n   Batch predicting...');
    const batchInput = [
      [0.1, 0.2, 0.3, 0.4, 0.5],
      [0.9, 0.8, 0.7, 0.6, 0.5],
      [0.5, 0.5, 0.5, 0.5, 0.5]
    ];

    const results = await bp.predictBatch(batchInput);
    console.log('   Results:', results);
  } catch (e) {
    console.log('   Error:', e.message);
    console.log('   Stack:', e.stack);
  }

  console.log('\n═'.repeat(60));
}

main().catch(console.error);
