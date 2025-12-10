/**
 * Debug Neural Trader API
 *
 * Investigate what neuralTrain and neuralPredict actually return
 */

const neuralTrader = require('neural-trader');

console.log('═'.repeat(60));
console.log('🔍 DEBUG: Neural Trader API Investigation');
console.log('═'.repeat(60));

// 1. Check what's exported from neural-trader
console.log('\n1️⃣ EXPORTED FUNCTIONS FROM neural-trader:');
console.log('   Keys:', Object.keys(neuralTrader));

// Check if functions exist
console.log('\n   typeof neuralTrain:', typeof neuralTrader.neuralTrain);
console.log('   typeof neuralPredict:', typeof neuralTrader.neuralPredict);

// 2. Check for native bindings
console.log('\n2️⃣ CHECKING NATIVE BINDINGS:');
try {
  const fs = require('fs');
  const path = require('path');
  const binaryPath = path.join(__dirname, '../node_modules/neural-trader/neural-trader-rust/neural-trader.linux-x64-gnu.node');
  console.log('   Binary exists:', fs.existsSync(binaryPath));

  // Try to load native module directly
  try {
    const native = require(binaryPath);
    console.log('   Native module keys:', Object.keys(native));
    console.log('   Native neuralTrain:', typeof native.neuralTrain);
    console.log('   Native neuralPredict:', typeof native.neuralPredict);
  } catch (e) {
    console.log('   Failed to load native:', e.message);
  }
} catch (e) {
  console.log('   Error checking binary:', e.message);
}

// 3. Test neuralTrain with simple data
console.log('\n3️⃣ TESTING neuralTrain:');
async function testTrain() {
  const testData = {
    features: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
               1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0],
    targets: [0.05, 0.10]  // 2 samples of 10 features each
  };

  console.log('   Input data:');
  console.log('   - features length:', testData.features.length);
  console.log('   - targets length:', testData.targets.length);

  try {
    const result = await neuralTrader.neuralTrain(
      'regression',
      JSON.stringify(testData),
      10,  // epochs
      2    // batch size
    );

    console.log('\n   Training result type:', typeof result);
    console.log('   Training result:', JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    console.log('   Training error:', e.message);
    console.log('   Full error:', e);
    return null;
  }
}

// 4. Test neuralPredict
async function testPredict(modelId) {
  console.log('\n4️⃣ TESTING neuralPredict:');

  const testFeatures = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  console.log('   Model ID:', modelId);
  console.log('   Features:', testFeatures);

  try {
    const result = await neuralTrader.neuralPredict(
      modelId || 'default',
      JSON.stringify(testFeatures)
    );

    console.log('\n   Prediction result type:', typeof result);
    console.log('   Prediction result:', JSON.stringify(result, null, 2));

    // Check specific fields
    console.log('\n   Checking result fields:');
    console.log('   - result.predictions:', result.predictions);
    console.log('   - result.prediction:', result.prediction);
    console.log('   - result.output:', result.output);
    console.log('   - result.value:', result.value);

    return result;
  } catch (e) {
    console.log('   Prediction error:', e.message);
    console.log('   Full error:', e);
    return null;
  }
}

// 5. Test with different feature arrays (with JSON parsing fix)
async function testVariousInputs(modelId) {
  console.log('\n5️⃣ TESTING VARIOUS INPUTS (with JSON parsing):');

  const testCases = [
    { name: 'Positive features', features: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
    { name: 'Negative features', features: [-0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5] },
    { name: 'Large values', features: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] },
    { name: 'Small values', features: [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01] },
    { name: 'Mixed values', features: [-1, 0.5, 2, -0.3, 0, 1.5, -2, 0.8, -0.1, 0.2] }
  ];

  const predictions = [];
  for (const test of testCases) {
    try {
      const resultRaw = await neuralTrader.neuralPredict(
        modelId || 'default',
        JSON.stringify(test.features)
      );
      // Parse JSON string
      const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
      const pred = result.predictions?.[0] || result.prediction || result.output || 0;
      predictions.push(pred);
      console.log(`   ${test.name}: ${pred}`);
    } catch (e) {
      console.log(`   ${test.name}: ERROR - ${e.message}`);
    }
  }

  // Check if predictions vary
  console.log('\n   Predictions vary:', new Set(predictions).size > 1 ? 'YES ✅' : 'NO ⚠️ (all same value)');
  console.log('   Unique predictions:', [...new Set(predictions)]);
}

// Run all tests
async function runAllTests() {
  const trainResult = await testTrain();
  const modelId = trainResult?.training_id || trainResult?.model_id || 'default';

  await testPredict(modelId);
  await testVariousInputs(modelId);

  console.log('\n' + '═'.repeat(60));
  console.log('🔍 DEBUG COMPLETE');
  console.log('═'.repeat(60));
}

runAllTests().catch(console.error);
