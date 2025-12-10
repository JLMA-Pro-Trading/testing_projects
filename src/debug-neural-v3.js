/**
 * Debug Neural Trader API v3 - Test initRuntime and NeuralTrader class
 */

const neuralTrader = require('neural-trader');

console.log('═'.repeat(60));
console.log('🔍 DEBUG v3: Testing initRuntime and NeuralTrader class');
console.log('═'.repeat(60));

async function main() {

  // 1. Test initRuntime
  console.log('\n1️⃣ initRuntime:');
  try {
    const resultRaw = await neuralTrader.initRuntime();
    const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    console.log('   Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 2. Get version info
  console.log('\n2️⃣ getVersionInfo:');
  try {
    const resultRaw = await neuralTrader.getVersionInfo();
    const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    console.log('   Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 3. Test NeuralTrader class
  console.log('\n3️⃣ NeuralTrader Class:');
  try {
    const nt = new neuralTrader.NeuralTrader();
    console.log('   Instance created');
    console.log('   Type:', typeof nt);

    // Check available methods
    const proto = Object.getPrototypeOf(nt);
    const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor');
    console.log('   Methods:', methods);

    // Check properties
    console.log('   Properties:', Object.keys(nt));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 4. Test runBacktest native function
  console.log('\n4️⃣ runBacktest:');
  try {
    const config = {
      symbol: 'BTCUSDT',
      strategy: 'momentum',
      startDate: '2024-01-01',
      endDate: '2024-12-01',
      initialCapital: 10000
    };
    const resultRaw = await neuralTrader.runBacktest(JSON.stringify(config));
    const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    console.log('   Result:', JSON.stringify(result, null, 2).slice(0, 500));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 5. Test quickAnalysis
  console.log('\n5️⃣ quickAnalysis:');
  try {
    const resultRaw = await neuralTrader.quickAnalysis('BTCUSDT');
    const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    console.log('   Result:', JSON.stringify(result, null, 2).slice(0, 500));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 6. Check BacktestEngine class
  console.log('\n6️⃣ BacktestEngine Class:');
  try {
    const engine = new neuralTrader.BacktestEngine();
    console.log('   Instance created');
    const proto = Object.getPrototypeOf(engine);
    const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor');
    console.log('   Methods:', methods);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 7. Check MarketDataProvider class
  console.log('\n7️⃣ MarketDataProvider Class:');
  try {
    const provider = new neuralTrader.MarketDataProvider();
    console.log('   Instance created');
    const proto = Object.getPrototypeOf(provider);
    const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor');
    console.log('   Methods:', methods);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 8. Test if predictions change after initRuntime
  console.log('\n8️⃣ Predictions after initRuntime:');
  try {
    const testInputs = [
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [-0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    ];

    for (const input of testInputs) {
      const predRaw = await neuralTrader.neuralPredict('default', JSON.stringify(input));
      const pred = typeof predRaw === 'string' ? JSON.parse(predRaw) : predRaw;
      console.log(`   Input[0]=${input[0]} -> Prediction: ${pred.predictions?.[0]}`);
    }
  } catch (e) {
    console.log('   Error:', e.message);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🔍 DEBUG v3 COMPLETE');
  console.log('═'.repeat(60));
}

main().catch(console.error);
