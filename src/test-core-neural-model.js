/**
 * Test neural-trader-core package's NeuralModel
 * This is a different binary than the main neural-trader package
 */

const path = require('path');

console.log('═'.repeat(60));
console.log('🧪 Testing neural-trader-core NeuralModel');
console.log('═'.repeat(60));

// Load from the extracted package
const corePath = path.join(__dirname, '../packages/neural-trader-core-2.0.0');
const core = require(corePath);

console.log('\n1️⃣ Checking exports:');
console.log('   NeuralModel:', typeof core.NeuralModel);
console.log('   BatchPredictor:', typeof core.BatchPredictor);
console.log('   listModelTypes:', typeof core.listModelTypes);
console.log('   ModelType:', typeof core.ModelType);

async function testNeuralModel() {
  const { NeuralModel, listModelTypes, ModelType } = core;

  // List available model types
  console.log('\n2️⃣ Available model types:');
  if (listModelTypes) {
    try {
      const types = listModelTypes();
      console.log('   ', types);
    } catch (e) {
      console.log('   Error:', e.message);
    }
  }

  // Check ModelType enum
  console.log('\n3️⃣ ModelType enum:');
  if (ModelType) {
    console.log('   ', ModelType);
  }

  // Try creating NeuralModel
  console.log('\n4️⃣ Creating NeuralModel:');
  try {
    const config = {
      modelType: 'LSTM',
      inputSize: 10,
      horizon: 1,
      hiddenSize: 64,
      numLayers: 2,
      dropout: 0.2,
      learningRate: 0.001
    };

    console.log('   Config:', JSON.stringify(config));
    const model = new NeuralModel(config);
    console.log('   ✅ Model created!');
    console.log('   Model type:', typeof model);

    // Check methods
    const proto = Object.getPrototypeOf(model);
    const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor');
    console.log('   Methods:', methods);

    // Generate training data
    console.log('\n5️⃣ Training model:');
    const trainData = [];
    const targets = [];
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 10; j++) {
        trainData.push(Math.random() * 2 - 1);
      }
      // Target correlates with sum of features
      const row = trainData.slice(-10);
      const sum = row.reduce((a, b) => a + b, 0);
      targets.push(sum > 0 ? 0.02 : -0.02);
    }

    const trainingConfig = {
      epochs: 20,
      batchSize: 16,
      validationSplit: 0.2,
      earlyStoppingPatience: 5,
      useGpu: false
    };

    console.log('   Training data: 100 samples x 10 features');
    console.log('   Config:', JSON.stringify(trainingConfig));

    const metrics = await model.train(trainData, targets, trainingConfig);
    console.log('   ✅ Training complete!');
    console.log('   Metrics:', JSON.stringify(metrics, null, 2));

    // Test predictions
    console.log('\n6️⃣ Testing predictions:');
    const testCases = [
      { name: 'All +0.5', input: Array(10).fill(0.5) },
      { name: 'All -0.5', input: Array(10).fill(-0.5) },
      { name: 'Mixed', input: [1, -1, 1, -1, 1, -1, 1, -1, 1, -1] }
    ];

    const predictions = [];
    for (const test of testCases) {
      const result = await model.predict(test.input);
      console.log(`   ${test.name}:`, result);
      predictions.push(result.predictions?.[0] || result);
    }

    // Check if predictions vary
    console.log('\n📊 Analysis:');
    const unique = new Set(predictions.map(p => typeof p === 'object' ? JSON.stringify(p) : p));
    console.log('   Unique predictions:', unique.size);
    console.log('   Predictions vary:', unique.size > 1 ? '✅ YES' : '❌ NO');

  } catch (e) {
    console.log('   Error:', e.message);
    console.log('   Stack:', e.stack);
  }
}

testNeuralModel().then(() => {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 TEST COMPLETE');
  console.log('═'.repeat(60));
}).catch(console.error);
