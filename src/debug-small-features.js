/**
 * Test with small feature values like real market data
 */

const core = require('@neural-trader/core');
const { NeuralModel } = core;

const MODEL_CONFIG = {
  modelType: 'lstm_attention',
  inputSize: 10,
  horizon: 1,
  hiddenSize: 64,
  numLayers: 2,
  dropout: 0.2,
  learningRate: 0.001
};

async function main() {
  console.log('═'.repeat(60));
  console.log('🔬 Testing with Small Feature Values');
  console.log('═'.repeat(60));

  const model = new NeuralModel(MODEL_CONFIG);

  // Training data with SMALL feature values (like real market returns)
  // Features: small values like -0.01 to 0.01 (1% returns)
  // Targets: also small like -0.02 to 0.02
  console.log('\n1️⃣ Creating training data with small feature values...');
  const trainFeatures = [];
  const trainTargets = [];

  for (let i = 0; i < 200; i++) {
    const features = [];
    for (let j = 0; j < 10; j++) {
      features.push((Math.random() - 0.5) * 0.02);  // -0.01 to 0.01
    }
    const sum = features.reduce((a, b) => a + b, 0);
    const target = sum > 0 ? 0.01 : -0.01;  // 1% returns

    trainFeatures.push(...features);
    trainTargets.push(target);
  }

  console.log('   Feature range: [-0.01, 0.01] (like 1% returns)');
  console.log('   Target values: +/- 0.01 (1%)');

  // Train
  console.log('\n2️⃣ Training...');
  const metrics = await model.train(trainFeatures, trainTargets, {
    epochs: 100,
    batchSize: 16,
    validationSplit: 0.2,
    earlyStoppingPatience: 20,
    useGpu: false
  });
  console.log('   Final loss:', metrics[metrics.length - 1].trainLoss);

  // Test with small values
  console.log('\n3️⃣ Testing predictions with small features:');

  const testCases = [
    { name: 'Small positive features', features: Array(10).fill(0.005) },
    { name: 'Small negative features', features: Array(10).fill(-0.005) },
    { name: 'Very small mixed', features: [0.001, -0.002, 0.003, -0.001, 0.002, -0.001, 0.001, -0.002, 0.001, -0.001] }
  ];

  for (const test of testCases) {
    const result = await model.predict(test.features);
    console.log(`\n   ${test.name}:`);
    console.log(`   Input sum: ${test.features.reduce((a, b) => a + b, 0).toFixed(6)}`);
    console.log(`   Prediction: ${result.predictions[0]}`);
    console.log(`   As percentage: ${(result.predictions[0] * 100).toFixed(4)}%`);
  }

  // Now test with SCALED features (scale small values to [-1, 1])
  console.log('\n═'.repeat(60));
  console.log('🔬 Testing with SCALED Features');
  console.log('═'.repeat(60));

  const model2 = new NeuralModel(MODEL_CONFIG);

  // Scale factor: multiply by 100 (so 0.01 becomes 1.0)
  const SCALE = 100;

  console.log('\n4️⃣ Creating scaled training data...');
  const scaledFeatures = [];
  const scaledTargets = [];

  for (let i = 0; i < 200; i++) {
    const features = [];
    for (let j = 0; j < 10; j++) {
      features.push((Math.random() - 0.5) * 0.02 * SCALE);  // -1 to 1
    }
    const sum = features.reduce((a, b) => a + b, 0);
    const target = sum > 0 ? 0.01 * SCALE : -0.01 * SCALE;  // Scaled targets

    scaledFeatures.push(...features);
    scaledTargets.push(target);
  }

  console.log('   Feature range: [-1, 1] (scaled by 100)');
  console.log('   Target values: +/- 1 (scaled)');

  console.log('\n5️⃣ Training with scaled data...');
  const metrics2 = await model2.train(scaledFeatures, scaledTargets, {
    epochs: 100,
    batchSize: 16,
    validationSplit: 0.2,
    earlyStoppingPatience: 20,
    useGpu: false
  });
  console.log('   Final loss:', metrics2[metrics2.length - 1].trainLoss);

  // Test with scaled features, then unscale predictions
  console.log('\n6️⃣ Testing with scaled features:');

  const scaledTestCases = [
    { name: 'Scaled positive', features: Array(10).fill(0.5), unscaledFeatures: Array(10).fill(0.005) },
    { name: 'Scaled negative', features: Array(10).fill(-0.5), unscaledFeatures: Array(10).fill(-0.005) },
    { name: 'Scaled mixed', features: [0.1, -0.2, 0.3, -0.1, 0.2, -0.1, 0.1, -0.2, 0.1, -0.1], unscaledFeatures: [0.001, -0.002, 0.003, -0.001, 0.002, -0.001, 0.001, -0.002, 0.001, -0.001] }
  ];

  for (const test of scaledTestCases) {
    const result = await model2.predict(test.features);
    const unscaledPred = result.predictions[0] / SCALE;
    console.log(`\n   ${test.name}:`);
    console.log(`   Scaled input sum: ${test.features.reduce((a, b) => a + b, 0).toFixed(4)}`);
    console.log(`   Scaled prediction: ${result.predictions[0]}`);
    console.log(`   Unscaled prediction: ${unscaledPred.toFixed(6)}`);
    console.log(`   As percentage: ${(unscaledPred * 100).toFixed(4)}%`);
  }

  console.log('\n═'.repeat(60));
  console.log('📊 CONCLUSION:');
  console.log('   The model works better with normalized features in [-1, 1] range.');
  console.log('   For real market data, scale features by 100 before training/predicting.');
  console.log('═'.repeat(60));
}

main().catch(console.error);
