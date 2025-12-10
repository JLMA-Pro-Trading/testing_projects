/**
 * Check what's actually exported from the native binary
 */

const path = require('path');
const binaryPath = path.join(__dirname, '../node_modules/neural-trader/neural-trader-rust/neural-trader.linux-x64-gnu.node');

console.log('Loading native binary directly:', binaryPath);

try {
  const nativeBinding = require(binaryPath);

  console.log('\nNative binding exports:');
  const keys = Object.keys(nativeBinding);
  console.log(`Total exports: ${keys.length}`);
  console.log('\nAll exports:');

  for (const key of keys.sort()) {
    const value = nativeBinding[key];
    const type = typeof value;
    let info = type;

    if (type === 'function') {
      // Try to get more info
      if (value.prototype && Object.keys(value.prototype).length > 0) {
        info = 'class';
      } else {
        info = 'function';
      }
    }

    console.log(`  ${key}: ${info}`);
  }

  // Check specific exports for NeuralModel
  console.log('\n--- Checking Neural-related exports ---');
  const neuralExports = ['NeuralModel', 'BatchPredictor', 'ModelType', 'listModelTypes',
                          'neuralTrain', 'neuralPredict', 'neuralBacktest', 'neuralEvaluate',
                          'neuralForecast', 'neuralOptimize', 'neuralModelStatus'];

  for (const name of neuralExports) {
    const value = nativeBinding[name];
    console.log(`  ${name}: ${value === undefined ? '❌ undefined' : '✅ ' + typeof value}`);
  }

} catch (e) {
  console.error('Error loading binary:', e.message);
}
