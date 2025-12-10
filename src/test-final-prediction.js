/**
 * Final test - check if predictions vary after training
 */

const path = require('path');
const binaryPath = path.join(__dirname, '../node_modules/neural-trader/neural-trader-rust/neural-trader.linux-x64-gnu.node');
const { neuralTrain, neuralPredict } = require(binaryPath);

async function main() {
  console.log('═'.repeat(50));
  console.log('🧪 FINAL TEST: Do predictions vary?');
  console.log('═'.repeat(50));

  // Create clear training data: positive sum = positive target
  const features = [];
  const targets = [];
  for (let i = 0; i < 100; i++) {
    const row = [];
    for (let j = 0; j < 10; j++) {
      row.push(Math.random() * 2 - 1);
    }
    features.push(...row);
    const sum = row.reduce((a, b) => a + b, 0);
    targets.push(sum > 0 ? 0.02 : -0.02);
  }

  const trainData = { features, targets };

  console.log('\n📚 Training with correlated data...');
  const trainRaw = await neuralTrain('regression', JSON.stringify(trainData), 100, 16);
  const trainResult = JSON.parse(trainRaw);
  console.log('   Training ID:', trainResult.training_id);

  console.log('\n🔮 Testing predictions:');
  const tests = [
    { name: 'All +0.5 (sum=5)', input: Array(10).fill(0.5) },
    { name: 'All -0.5 (sum=-5)', input: Array(10).fill(-0.5) },
    { name: 'Mixed (sum=0)', input: [1, -1, 1, -1, 1, -1, 1, -1, 1, -1] },
    { name: 'Random A', input: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] },
    { name: 'Random B', input: [-0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0] }
  ];

  const predictions = [];
  for (const test of tests) {
    const predRaw = await neuralPredict(trainResult.training_id, JSON.stringify(test.input));
    const pred = JSON.parse(predRaw);
    const value = pred.predictions?.[0] || 0;
    predictions.push(value);
    console.log(`   ${test.name}: ${value}`);
  }

  console.log('\n📊 Analysis:');
  const unique = new Set(predictions);
  console.log(`   Unique predictions: ${unique.size}`);
  console.log(`   All same value: ${unique.size === 1 ? '⚠️ YES (MOCKED)' : '✅ NO (WORKING)'}`);

  if (unique.size === 1) {
    console.log('\n❌ CONCLUSION: Predictions are MOCKED');
    console.log('   The native binary returns demo data regardless of training');
  } else {
    console.log('\n✅ CONCLUSION: Model is LEARNING');
    console.log('   Predictions vary based on input');
  }
}

main().catch(console.error);
