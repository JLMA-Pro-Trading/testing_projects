/**
 * Test NeuralTrader class - the main trading class
 */

const core = require('@neural-trader/core');
const { NeuralTrader } = core;

console.log('═'.repeat(60));
console.log('🔬 Testing NeuralTrader Class');
console.log('═'.repeat(60));

console.log('\n1️⃣ NeuralTrader function signature:');
console.log('   toString:', NeuralTrader.toString().slice(0, 200));

// Try different config structures
const configs = [
  {
    name: 'Basic config',
    config: {
      symbol: 'BTCUSDT',
      timeframe: '1h'
    }
  },
  {
    name: 'With model config',
    config: {
      symbol: 'BTCUSDT',
      timeframe: '1h',
      modelType: 'lstm_attention',
      inputSize: 20
    }
  },
  {
    name: 'Full config',
    config: {
      symbol: 'BTCUSDT',
      timeframe: '1h',
      modelConfig: {
        modelType: 'lstm_attention',
        inputSize: 20,
        horizon: 1,
        hiddenSize: 64,
        numLayers: 2,
        dropout: 0.2,
        learningRate: 0.001
      }
    }
  },
  {
    name: 'Strategy config',
    config: {
      strategy: {
        symbol: 'BTCUSDT',
        timeframe: '1h'
      }
    }
  }
];

for (const { name, config } of configs) {
  console.log(`\n2️⃣ Trying: ${name}`);
  console.log('   Config:', JSON.stringify(config));

  try {
    const nt = new NeuralTrader(config);
    console.log('   ✅ Created successfully!');
    console.log('   Type:', typeof nt);
    console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(nt)));

    // Try to use methods
    if (nt.predict) {
      try {
        const pred = nt.predict([1, 2, 3, 4, 5]);
        console.log('   predict() result:', pred);
      } catch (e) {
        console.log('   predict() error:', e.message);
      }
    }

    if (nt.train) {
      try {
        const result = nt.train([1, 2, 3], [0.1]);
        console.log('   train() result:', result);
      } catch (e) {
        console.log('   train() error:', e.message);
      }
    }

    break;  // Stop if we succeed
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
}

// Also try creating from BacktestEngine
console.log('\n3️⃣ Testing BacktestEngine:');
try {
  const be = new core.BacktestEngine({
    initialCapital: 10000,
    symbol: 'BTCUSDT',
    timeframe: '1h'
  });
  console.log('   ✅ Created!');
  console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(be)));
} catch (e) {
  console.log('   Error:', e.message);
}

console.log('\n═'.repeat(60));
