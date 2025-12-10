/**
 * Test NeuralTrader with complete config
 */

const core = require('@neural-trader/core');
const { NeuralTrader, BacktestEngine } = core;

console.log('═'.repeat(60));
console.log('🔬 Testing NeuralTrader with Full Config');
console.log('═'.repeat(60));

// Try NeuralTrader with paperTrading
console.log('\n1️⃣ NeuralTrader with paperTrading:');
const ntConfig = {
  symbol: 'BTCUSDT',
  timeframe: '1h',
  paperTrading: true,
  broker: 'binance',
  apiKey: 'test',
  apiSecret: 'test'
};

try {
  const nt = new NeuralTrader(ntConfig);
  console.log('   ✅ Created!');
  console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(nt)));
} catch (e) {
  console.log('   Error:', e.message);

  // Add more fields
  console.log('\n   Trying with more fields...');
  const ntConfig2 = {
    ...ntConfig,
    modelConfig: {
      modelType: 'lstm_attention',
      inputSize: 20,
      horizon: 1,
      hiddenSize: 64,
      numLayers: 2,
      dropout: 0.2,
      learningRate: 0.001
    }
  };

  try {
    const nt2 = new NeuralTrader(ntConfig2);
    console.log('   ✅ Created with modelConfig!');
    console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(nt2)));
  } catch (e2) {
    console.log('   Error:', e2.message);
  }
}

// Try BacktestEngine with all required fields
console.log('\n2️⃣ BacktestEngine with full config:');
const beConfig = {
  initialCapital: 10000,
  startDate: '2024-01-01',
  endDate: '2024-12-01',
  symbol: 'BTCUSDT',
  timeframe: '1h'
};

try {
  const be = new BacktestEngine(beConfig);
  console.log('   ✅ Created!');
  console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(be)));

  // Try using the engine
  if (be.run) {
    console.log('\n   Trying be.run()...');
    const result = be.run();
    console.log('   Result:', result);
  }
} catch (e) {
  console.log('   Error:', e.message);
}

// Try PortfolioOptimizer
console.log('\n3️⃣ PortfolioOptimizer:');
try {
  const po = new core.PortfolioOptimizer({
    symbols: ['BTCUSDT'],
    initialCapital: 10000
  });
  console.log('   ✅ Created!');
} catch (e) {
  console.log('   Error:', e.message);
}

// Try StrategyRunner
console.log('\n4️⃣ StrategyRunner methods:');
const sr = new core.StrategyRunner();
console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(sr)));

if (sr.addStrategy) {
  console.log('\n   Trying addStrategy...');
  try {
    sr.addStrategy({
      name: 'test',
      symbol: 'BTCUSDT',
      timeframe: '1h'
    });
  } catch (e) {
    console.log('   Error:', e.message);
  }
}

// Check BatchPredictor more thoroughly
console.log('\n5️⃣ BatchPredictor:');
const bp = new core.BatchPredictor();
console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(bp)));

if (bp.predict) {
  console.log('\n   Trying bp.predict...');
  try {
    const result = bp.predict([[1, 2, 3], [4, 5, 6]]);
    console.log('   Result:', result);
  } catch (e) {
    console.log('   Error:', e.message);
  }
}

console.log('\n═'.repeat(60));
