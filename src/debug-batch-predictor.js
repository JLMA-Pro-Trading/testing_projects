/**
 * Test BatchPredictor API
 */

const core = require('@neural-trader/core');

console.log('═'.repeat(60));
console.log('🔬 Testing BatchPredictor and Other APIs');
console.log('═'.repeat(60));

console.log('\n📋 All exports from @neural-trader/core:');
console.log(Object.keys(core));

// Test BatchPredictor
console.log('\n1️⃣ BatchPredictor:');
console.log('   Type:', typeof core.BatchPredictor);

if (core.BatchPredictor) {
  try {
    const bp = new core.BatchPredictor();
    console.log('   Instance:', bp);
  } catch (e) {
    console.log('   Constructor error:', e.message);
  }
}

// Test NeuralTrader (main class?)
console.log('\n2️⃣ NeuralTrader:');
console.log('   Type:', typeof core.NeuralTrader);

if (core.NeuralTrader) {
  try {
    const nt = new core.NeuralTrader();
    console.log('   Instance:', nt);
    console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(nt)));
  } catch (e) {
    console.log('   Constructor error:', e.message);
  }
}

// Test StrategyRunner
console.log('\n3️⃣ StrategyRunner:');
console.log('   Type:', typeof core.StrategyRunner);

if (core.StrategyRunner) {
  try {
    const sr = new core.StrategyRunner();
    console.log('   Instance:', sr);
  } catch (e) {
    console.log('   Constructor error:', e.message);
  }
}

// Test BacktestEngine
console.log('\n4️⃣ BacktestEngine:');
console.log('   Type:', typeof core.BacktestEngine);

if (core.BacktestEngine) {
  try {
    const be = new core.BacktestEngine({});
    console.log('   Instance:', be);
    console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(be)));
  } catch (e) {
    console.log('   Constructor error:', e.message);
  }
}

// Test calculateIndicator
console.log('\n5️⃣ calculateIndicator:');
console.log('   Type:', typeof core.calculateIndicator);

if (core.calculateIndicator) {
  try {
    const result = core.calculateIndicator('sma', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { period: 3 });
    console.log('   SMA result:', result);
  } catch (e) {
    console.log('   Error:', e.message);
  }
}

// Test getVersionInfo
console.log('\n6️⃣ getVersionInfo:');
if (core.getVersionInfo) {
  try {
    const info = core.getVersionInfo();
    console.log('   Version:', info);
  } catch (e) {
    console.log('   Error:', e.message);
  }
}

// Test listModelTypes more thoroughly
console.log('\n7️⃣ listModelTypes:');
if (core.listModelTypes) {
  console.log('   Result:', core.listModelTypes());
}

// Test ModelType enum
console.log('\n8️⃣ ModelType enum:');
if (core.ModelType) {
  console.log('   Values:', core.ModelType);
}

console.log('\n═'.repeat(60));
