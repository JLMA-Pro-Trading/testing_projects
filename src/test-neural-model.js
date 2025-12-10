/**
 * Debug Neural Trader v2.6.3 - Test NeuralModel class
 */

console.log('═'.repeat(60));
console.log('🔍 DEBUG: Testing Neural Trader v2.6.3 NeuralModel');
console.log('═'.repeat(60));

// Try loading from neural-trader-rust directly
console.log('\n1️⃣ Loading neural-trader-rust module:');
try {
  const nativeModule = require('neural-trader/neural-trader-rust');
  console.log('   Keys:', Object.keys(nativeModule));
  console.log('   NeuralModel:', typeof nativeModule.NeuralModel);
  console.log('   BatchPredictor:', typeof nativeModule.BatchPredictor);
  console.log('   ModelType:', typeof nativeModule.ModelType);
  console.log('   listModelTypes:', typeof nativeModule.listModelTypes);
} catch (e) {
  console.log('   Error:', e.message);
}

// Try loading NeuralModel
console.log('\n2️⃣ Testing NeuralModel:');
async function testNeuralModel() {
  try {
    const { NeuralModel, listModelTypes, ModelType } = require('neural-trader/neural-trader-rust');

    // List available model types
    if (listModelTypes) {
      console.log('   Available model types:', listModelTypes());
    }

    // Create a model
    const config = {
      modelType: 'LSTM',
      inputSize: 10,
      horizon: 1,
      hiddenSize: 64,
      numLayers: 2,
      dropout: 0.2,
      learningRate: 0.001
    };

    console.log('\n   Creating NeuralModel with config:', JSON.stringify(config, null, 2));
    const model = new NeuralModel(config);
    console.log('   ✅ Model created successfully!');
    console.log('   Model type:', typeof model);

    // Check available methods
    const proto = Object.getPrototypeOf(model);
    const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor');
    console.log('   Methods:', methods);

    // Generate training data (100 samples, 10 features each)
    const trainData = [];
    const targets = [];
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 10; j++) {
        trainData.push(Math.random() * 2 - 1);
      }
      targets.push(Math.random() * 0.1 - 0.05);  // Returns between -5% and 5%
    }

    // Training config
    const trainingConfig = {
      epochs: 10,
      batchSize: 16,
      validationSplit: 0.2,
      earlyStoppingPatience: 5,
      useGpu: false
    };

    console.log('\n3️⃣ Training model:');
    console.log('   Training data:', trainData.length, 'values');
    console.log('   Targets:', targets.length, 'values');
    console.log('   Config:', JSON.stringify(trainingConfig));

    const metrics = await model.train(trainData, targets, trainingConfig);
    console.log('   ✅ Training complete!');
    console.log('   Metrics:', JSON.stringify(metrics, null, 2));

    // Test prediction
    console.log('\n4️⃣ Testing prediction:');
    const testInput = [];
    for (let i = 0; i < 10; i++) {
      testInput.push(Math.random() * 2 - 1);
    }
    console.log('   Input:', testInput);

    const prediction = await model.predict(testInput);
    console.log('   ✅ Prediction result:', JSON.stringify(prediction, null, 2));

    // Test with different inputs
    console.log('\n5️⃣ Testing prediction variance:');
    const testCases = [
      { name: 'All positive', data: Array(10).fill(0.5) },
      { name: 'All negative', data: Array(10).fill(-0.5) },
      { name: 'Mixed', data: [0.1, -0.2, 0.3, -0.4, 0.5, -0.6, 0.7, -0.8, 0.9, -1.0] }
    ];

    for (const test of testCases) {
      const pred = await model.predict(test.data);
      console.log(`   ${test.name}: ${JSON.stringify(pred.predictions || pred)}`);
    }

    // Get model info
    if (model.getInfo) {
      console.log('\n6️⃣ Model info:');
      const info = await model.getInfo();
      console.log('   ', info);
    }

  } catch (e) {
    console.log('   Error:', e.message);
    console.log('   Stack:', e.stack);
  }
}

testNeuralModel().then(() => {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 DEBUG COMPLETE');
  console.log('═'.repeat(60));
}).catch(console.error);
