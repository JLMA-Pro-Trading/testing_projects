/**
 * Test cliTrainNeuralModel function
 */

const path = require('path');
const binaryPath = path.join(__dirname, '../node_modules/neural-trader/neural-trader-rust/neural-trader.linux-x64-gnu.node');
const nativeBinding = require(binaryPath);

console.log('═'.repeat(60));
console.log('🔍 Testing cliTrainNeuralModel');
console.log('═'.repeat(60));

async function main() {

  const { cliTrainNeuralModel } = nativeBinding;

  // Test with different parameters
  console.log('\n1️⃣ Testing cliTrainNeuralModel(LSTM, ./data, {}):');
  try {
    const result = await cliTrainNeuralModel('LSTM', './data', '{}');
    console.log('   Raw result type:', typeof result);
    console.log('   Raw result:', result);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // Test with proper config
  console.log('\n2️⃣ Testing with config object:');
  try {
    const config = {
      epochs: 10,
      batchSize: 32,
      learningRate: 0.001
    };
    const result = await cliTrainNeuralModel('LSTM', './data', JSON.stringify(config));
    console.log('   Raw result:', result);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // Test neuralTrain with proper data format
  console.log('\n3️⃣ Testing neuralTrain with proper format:');
  try {
    const { neuralTrain } = nativeBinding;

    // Generate proper training data
    const features = [];
    const targets = [];
    for (let i = 0; i < 100; i++) {
      const row = [];
      for (let j = 0; j < 10; j++) {
        row.push(Math.random() * 2 - 1);
      }
      features.push(row);
      targets.push(Math.random() * 0.1 - 0.05);
    }

    const trainData = {
      features: features.flat(),  // Flatten for NAPI
      targets: targets,
      featureCount: 10,
      sampleCount: 100
    };

    console.log('   Training data shape:');
    console.log('     features:', trainData.features.length);
    console.log('     targets:', trainData.targets.length);
    console.log('     featureCount:', trainData.featureCount);
    console.log('     sampleCount:', trainData.sampleCount);

    const result = await neuralTrain('LSTM', JSON.stringify(trainData), 10, 16);
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    console.log('   Result:', JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // Test if predictions vary after "training"
  console.log('\n4️⃣ Testing neuralPredict after training:');
  try {
    const { neuralTrain, neuralPredict } = nativeBinding;

    // Train first
    const features = [];
    const targets = [];
    for (let i = 0; i < 100; i++) {
      const row = [];
      for (let j = 0; j < 10; j++) {
        row.push(Math.random() * 2 - 1);
      }
      features.push(row);
      // Make targets correlate with feature sum (positive sum = positive target)
      const sum = row.reduce((a, b) => a + b, 0);
      targets.push(sum > 0 ? 0.02 : -0.02);  // Clear signal
    }

    const trainData = {
      features: features.flat(),
      targets: targets
    };

    console.log('   Training model with correlated data...');
    const trainResult = await neuralTrain('LSTM', JSON.stringify(trainData), 50, 16);
    const trainParsed = typeof trainResult === 'string' ? JSON.parse(trainResult) : trainResult;
    console.log('   Training ID:', trainParsed.training_id);
    console.log('   Final loss:', trainParsed.training_metrics?.final_loss);

    // Test predictions
    const testCases = [
      { name: 'Positive sum', input: Array(10).fill(0.5) },      // sum = 5
      { name: 'Negative sum', input: Array(10).fill(-0.5) },     // sum = -5
      { name: 'Zero sum', input: [0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, -0.5] }
    ];

    console.log('\n   Predictions (should correlate with input sum):');
    for (const test of testCases) {
      const predResult = await neuralPredict(trainParsed.training_id || 'default', JSON.stringify(test.input));
      const pred = typeof predResult === 'string' ? JSON.parse(predResult) : predResult;
      const prediction = pred.predictions?.[0] || pred.prediction || 0;
      const inputSum = test.input.reduce((a, b) => a + b, 0);
      console.log(`     ${test.name} (sum=${inputSum.toFixed(1)}): prediction=${prediction}`);
    }

  } catch (e) {
    console.log('   Error:', e.message);
    console.log('   Stack:', e.stack);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🔍 COMPLETE');
  console.log('═'.repeat(60));
}

main().catch(console.error);
