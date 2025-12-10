/**
 * Debug Neural Trader API v2 - Test all neural functions
 */

const neuralTrader = require('neural-trader');

console.log('═'.repeat(60));
console.log('🔍 DEBUG v2: Testing ALL Neural Functions');
console.log('═'.repeat(60));

// Sample training data
const trainData = {
  features: [],
  targets: []
};

// Generate 100 samples of 10 features each
for (let i = 0; i < 100; i++) {
  for (let j = 0; j < 10; j++) {
    trainData.features.push(Math.random() * 2 - 1);  // Random -1 to 1
  }
  trainData.targets.push(Math.random() * 0.1 - 0.05);  // Random returns -5% to 5%
}

async function testAllNeuralFunctions() {

  // 1. neuralTrain
  console.log('\n1️⃣ neuralTrain:');
  try {
    const resultRaw = await neuralTrader.neuralTrain(
      'regression',
      JSON.stringify(trainData),
      50,
      16
    );
    const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    console.log('   Status:', result.status);
    console.log('   Training ID:', result.training_id);
    console.log('   Final Loss:', result.training_metrics?.final_loss);
    console.log('   GPU Accelerated:', result.gpu_accelerated);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 2. neuralForecast
  console.log('\n2️⃣ neuralForecast:');
  try {
    const testFeatures = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const resultRaw = await neuralTrader.neuralForecast(
      'default',
      JSON.stringify(testFeatures),
      5  // horizon
    );
    const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    console.log('   Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 3. neuralEvaluate
  console.log('\n3️⃣ neuralEvaluate:');
  try {
    const evalData = {
      features: trainData.features.slice(0, 100),  // 10 samples
      targets: trainData.targets.slice(0, 10)
    };
    const resultRaw = await neuralTrader.neuralEvaluate(
      'default',
      JSON.stringify(evalData)
    );
    const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    console.log('   Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 4. neuralBacktest
  console.log('\n4️⃣ neuralBacktest:');
  try {
    const backtestConfig = {
      model_id: 'default',
      start_date: '2024-01-01',
      end_date: '2024-12-01',
      initial_capital: 10000
    };
    const resultRaw = await neuralTrader.neuralBacktest(
      JSON.stringify(backtestConfig)
    );
    const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    console.log('   Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 5. neuralModelStatus
  console.log('\n5️⃣ neuralModelStatus:');
  try {
    const resultRaw = await neuralTrader.neuralModelStatus('default');
    const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    console.log('   Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 6. neuralOptimize
  console.log('\n6️⃣ neuralOptimize:');
  try {
    const optimizeConfig = {
      model_id: 'default',
      optimization_target: 'sharpe_ratio',
      iterations: 10
    };
    const resultRaw = await neuralTrader.neuralOptimize(JSON.stringify(optimizeConfig));
    const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    console.log('   Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 7. Check if training with model ID helps
  console.log('\n7️⃣ Testing train then predict with same ID:');
  try {
    // Train
    const trainResultRaw = await neuralTrader.neuralTrain(
      'test_model',
      JSON.stringify(trainData),
      10,
      8
    );
    const trainResult = typeof trainResultRaw === 'string' ? JSON.parse(trainResultRaw) : trainResultRaw;
    console.log('   Trained model ID:', trainResult.training_id);

    // Predict with that ID
    const testInputs = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [-0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5]
    ];

    for (const input of testInputs) {
      const predRaw = await neuralTrader.neuralPredict(
        trainResult.training_id,
        JSON.stringify(input)
      );
      const pred = typeof predRaw === 'string' ? JSON.parse(predRaw) : predRaw;
      console.log(`   Input sum ${input.reduce((a,b)=>a+b,0).toFixed(1)} -> Prediction: ${pred.predictions?.[0]}`);
    }
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 8. Check NeuralTrader class
  console.log('\n8️⃣ NeuralTrader Class:');
  try {
    console.log('   Constructor exists:', typeof neuralTrader.NeuralTrader === 'function');
    const nt = new neuralTrader.NeuralTrader();
    console.log('   Instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(nt)).filter(m => m !== 'constructor'));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🔍 DEBUG v2 COMPLETE');
  console.log('═'.repeat(60));
}

testAllNeuralFunctions().catch(console.error);
