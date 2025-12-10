/**
 * Deep debug: Inspect raw NeuralModel predict output
 */

const core = require('@neural-trader/core');
const { NeuralModel } = core;

const MODEL_CONFIG = {
  modelType: 'lstm_attention',
  inputSize: 10,
  horizon: 1,
  hiddenSize: 32,
  numLayers: 2,
  dropout: 0.2,
  learningRate: 0.001
};

async function main() {
  console.log('═'.repeat(60));
  console.log('🔬 RAW NeuralModel Predict Debug');
  console.log('═'.repeat(60));

  // Create model
  console.log('\n1️⃣ Creating model...');
  const model = new NeuralModel(MODEL_CONFIG);
  console.log('   Model created:', typeof model);
  console.log('   Model methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(model)));

  // Generate simple training data with clear pattern
  console.log('\n2️⃣ Creating training data with clear pattern...');
  const trainFeatures = [];
  const trainTargets = [];

  // Pattern: if sum of features > 0, target is positive
  for (let i = 0; i < 200; i++) {
    const features = [];
    for (let j = 0; j < 10; j++) {
      features.push(Math.random() * 2 - 1);  // -1 to 1
    }
    const sum = features.reduce((a, b) => a + b, 0);
    const target = sum > 0 ? 0.05 : -0.05;  // 5% returns

    trainFeatures.push(...features);
    trainTargets.push(target);
  }

  console.log('   Training samples: 200');
  console.log('   Features per sample: 10');
  console.log('   Target values: +/- 5%');

  // Train
  console.log('\n3️⃣ Training model...');
  const metrics = await model.train(trainFeatures, trainTargets, {
    epochs: 50,
    batchSize: 16,
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    useGpu: false
  });

  console.log('   Training complete!');
  console.log('   Final metrics:', JSON.stringify(metrics[metrics.length - 1], null, 2));

  // Test predictions with detailed inspection
  console.log('\n4️⃣ Testing predictions (RAW OUTPUT INSPECTION):');

  const testCases = [
    { name: 'All positive', features: Array(10).fill(0.8) },
    { name: 'All negative', features: Array(10).fill(-0.8) },
    { name: 'Mixed (sum=0)', features: [0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, -0.5] },
    { name: 'Strong positive', features: Array(10).fill(1.0) },
    { name: 'Strong negative', features: Array(10).fill(-1.0) }
  ];

  for (const test of testCases) {
    console.log(`\n   Test: ${test.name}`);
    console.log(`   Input features: [${test.features.join(', ')}]`);
    console.log(`   Feature sum: ${test.features.reduce((a, b) => a + b, 0)}`);

    const result = await model.predict(test.features);

    console.log(`   Raw result type: ${typeof result}`);
    console.log(`   Raw result: ${JSON.stringify(result, null, 2)}`);

    if (typeof result === 'object') {
      console.log(`   result.predictions: ${JSON.stringify(result.predictions)}`);
      console.log(`   result.lowerBound: ${JSON.stringify(result.lowerBound)}`);
      console.log(`   result.upperBound: ${JSON.stringify(result.upperBound)}`);

      if (result.predictions) {
        console.log(`   predictions[0] type: ${typeof result.predictions[0]}`);
        console.log(`   predictions[0] value: ${result.predictions[0]}`);
        console.log(`   predictions[0] === 0: ${result.predictions[0] === 0}`);
        console.log(`   predictions[0] == 0: ${result.predictions[0] == 0}`);
      }
    }
  }

  // Also test what we get from model methods directly
  console.log('\n5️⃣ Checking model state:');
  if (model.getConfig) {
    console.log('   Model config:', model.getConfig());
  }
  if (model.getState) {
    console.log('   Model state:', model.getState());
  }

  console.log('\n' + '═'.repeat(60));
}

main().catch(err => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
});
