/**
 * Test different input formats for NeuralModel
 * Maybe it expects sequences differently?
 */

const core = require('@neural-trader/core');
const { NeuralModel } = core;

async function main() {
  console.log('═'.repeat(60));
  console.log('🔬 Testing Input Formats');
  console.log('═'.repeat(60));

  // Check model info
  console.log('\n1️⃣ Checking model info method:');
  const config = {
    modelType: 'lstm_attention',
    inputSize: 5,  // 5 features per timestep
    horizon: 1,
    hiddenSize: 32,
    numLayers: 2,
    dropout: 0.2,
    learningRate: 0.001
  };

  const model = new NeuralModel(config);
  if (model.getInfo) {
    console.log('   Model info:', model.getInfo());
  }

  // Test 1: Flat array (current approach)
  console.log('\n2️⃣ Test: Flat array (100 samples * 5 features = 500 floats):');
  const flatFeatures = [];
  const targets1 = [];
  for (let i = 0; i < 100; i++) {
    const row = [1, 2, 3, 4, 5].map(x => Math.random());
    flatFeatures.push(...row);
    targets1.push(row[0] > 0.5 ? 1 : -1);
  }
  console.log(`   Features length: ${flatFeatures.length}`);
  console.log(`   Targets length: ${targets1.length}`);

  const metrics1 = await model.train(flatFeatures, targets1, {
    epochs: 30,
    batchSize: 16,
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    useGpu: false
  });
  console.log('   Training loss:', metrics1[metrics1.length - 1].trainLoss);

  const pred1 = await model.predict([0.9, 0.9, 0.9, 0.9, 0.9]);
  console.log('   Predict [0.9, 0.9, 0.9, 0.9, 0.9]:', pred1.predictions[0]);

  // Test 2: Check what happens with LARGE targets vs features
  console.log('\n3️⃣ Test: Large targets (features 0-1, targets ±100):');
  const model2 = new NeuralModel(config);
  const features2 = [];
  const targets2 = [];
  for (let i = 0; i < 100; i++) {
    const row = [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
    features2.push(...row);
    targets2.push(row.reduce((a, b) => a + b, 0) > 2.5 ? 100 : -100);  // Large targets
  }

  const metrics2 = await model2.train(features2, targets2, {
    epochs: 30,
    batchSize: 16,
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    useGpu: false
  });
  console.log('   Training loss:', metrics2[metrics2.length - 1].trainLoss);

  const pred2High = await model2.predict([0.9, 0.9, 0.9, 0.9, 0.9]);  // Sum > 2.5
  const pred2Low = await model2.predict([0.1, 0.1, 0.1, 0.1, 0.1]);   // Sum < 2.5
  console.log('   Predict [0.9, 0.9, 0.9, 0.9, 0.9] (expect ~100):', pred2High.predictions[0]);
  console.log('   Predict [0.1, 0.1, 0.1, 0.1, 0.1] (expect ~-100):', pred2Low.predictions[0]);

  // Test 3: Check save/load cycle
  console.log('\n4️⃣ Test: Check if save changes behavior:');
  const model3 = new NeuralModel(config);
  const features3 = [];
  const targets3 = [];
  for (let i = 0; i < 100; i++) {
    const val = Math.random();
    features3.push(val, val, val, val, val);
    targets3.push(val > 0.5 ? 10 : -10);
  }

  await model3.train(features3, targets3, {
    epochs: 50,
    batchSize: 8,
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    useGpu: false
  });

  // Save model
  const savedState = await model3.save();
  console.log('   Saved state type:', typeof savedState);
  console.log('   Saved state length:', savedState?.length || 'N/A');

  // Load into new model
  const model4 = new NeuralModel(config);
  await model4.load(savedState);

  const pred3 = await model4.predict([0.9, 0.9, 0.9, 0.9, 0.9]);
  const pred4 = await model4.predict([0.1, 0.1, 0.1, 0.1, 0.1]);
  console.log('   After load, predict [0.9...] (expect ~10):', pred3.predictions[0]);
  console.log('   After load, predict [0.1...] (expect ~-10):', pred4.predictions[0]);

  console.log('\n═'.repeat(60));
}

main().catch(console.error);
