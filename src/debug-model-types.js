/**
 * Test different model types to find one that actually learns
 */

const core = require('@neural-trader/core');
const { NeuralModel, listModelTypes } = core;

async function testModelType(modelType) {
  const config = {
    modelType,
    inputSize: 10,
    horizon: 1,
    hiddenSize: 64,
    numLayers: 2,
    dropout: 0.2,
    learningRate: 0.001
  };

  console.log(`\n   Testing: ${modelType}`);

  try {
    const model = new NeuralModel(config);

    // Training data: clear pattern - positive sum -> positive target
    const features = [];
    const targets = [];

    for (let i = 0; i < 200; i++) {
      const row = [];
      for (let j = 0; j < 10; j++) {
        row.push(Math.random() * 2 - 1);
      }
      const sum = row.reduce((a, b) => a + b, 0);
      features.push(...row);
      targets.push(sum > 0 ? 1 : -1);
    }

    // Train
    const metrics = await model.train(features, targets, {
      epochs: 50,
      batchSize: 16,
      validationSplit: 0.2,
      earlyStoppingPatience: 10,
      useGpu: false
    });

    // Test
    const testPos = await model.predict(Array(10).fill(0.5));
    const testNeg = await model.predict(Array(10).fill(-0.5));
    const testZero = await model.predict([0.1, -0.1, 0.1, -0.1, 0.1, -0.1, 0.1, -0.1, 0.1, -0.1]);

    console.log(`   Final loss: ${metrics[metrics.length - 1].trainLoss.toFixed(4)}`);
    console.log(`   Positive input [0.5, ...] -> Pred: ${testPos.predictions[0].toFixed(4)} (expected ~1)`);
    console.log(`   Negative input [-0.5, ...] -> Pred: ${testNeg.predictions[0].toFixed(4)} (expected ~-1)`);
    console.log(`   Zero sum input -> Pred: ${testZero.predictions[0].toFixed(4)} (expected ~0)`);

    // Check if model learned
    const learned = (testPos.predictions[0] > 0.3 && testNeg.predictions[0] < -0.3);
    console.log(`   Model learned: ${learned ? '✅ YES' : '❌ NO'}`);

    return learned;
  } catch (e) {
    console.log(`   Error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔬 Testing Different Model Types');
  console.log('═'.repeat(60));

  // List available model types
  console.log('\n📋 Available model types:');
  if (listModelTypes) {
    try {
      const types = listModelTypes();
      console.log('   ', types);
    } catch (e) {
      console.log('   Error listing types:', e.message);
    }
  }

  // Test each model type
  const modelTypes = ['lstm_attention', 'lstm', 'gru', 'transformer', 'nhits', 'tcn'];
  const results = {};

  for (const type of modelTypes) {
    results[type] = await testModelType(type);
  }

  console.log('\n═'.repeat(60));
  console.log('📊 SUMMARY:');
  for (const [type, worked] of Object.entries(results)) {
    console.log(`   ${type}: ${worked ? '✅ Works' : '❌ Pass-through'}`);
  }
  console.log('═'.repeat(60));
}

main().catch(console.error);
