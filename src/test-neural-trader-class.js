/**
 * Test NeuralTrader class and cliTrainNeuralModel
 */

const path = require('path');
const binaryPath = path.join(__dirname, '../node_modules/neural-trader/neural-trader-rust/neural-trader.linux-x64-gnu.node');
const nativeBinding = require(binaryPath);

console.log('═'.repeat(60));
console.log('🔍 Testing NeuralTrader class and CLI training');
console.log('═'.repeat(60));

async function main() {

  // 1. Test NeuralTrader class
  console.log('\n1️⃣ NeuralTrader Class:');
  try {
    const { NeuralTrader } = nativeBinding;
    console.log('   Type:', typeof NeuralTrader);

    // Check prototype methods
    if (NeuralTrader.prototype) {
      const methods = Object.getOwnPropertyNames(NeuralTrader.prototype).filter(m => m !== 'constructor');
      console.log('   Methods:', methods);
    }

    // Try to create instance
    const nt = new NeuralTrader();
    console.log('   Instance created:', typeof nt);

    // Check instance properties
    console.log('   Instance keys:', Object.keys(nt));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 2. Test cliTrainNeuralModel
  console.log('\n2️⃣ cliTrainNeuralModel:');
  try {
    const { cliTrainNeuralModel } = nativeBinding;
    console.log('   Type:', typeof cliTrainNeuralModel);

    // Try calling it
    const result = await cliTrainNeuralModel('LSTM', './data', '{}');
    console.log('   Result:', typeof result === 'string' ? JSON.parse(result) : result);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 3. Test StrategyRunner class
  console.log('\n3️⃣ StrategyRunner Class:');
  try {
    const { StrategyRunner } = nativeBinding;
    console.log('   Type:', typeof StrategyRunner);

    if (StrategyRunner.prototype) {
      const methods = Object.getOwnPropertyNames(StrategyRunner.prototype).filter(m => m !== 'constructor');
      console.log('   Methods:', methods);
    }
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 4. Test BacktestEngine class
  console.log('\n4️⃣ BacktestEngine Class:');
  try {
    const { BacktestEngine } = nativeBinding;
    console.log('   Type:', typeof BacktestEngine);

    if (BacktestEngine.prototype) {
      const methods = Object.getOwnPropertyNames(BacktestEngine.prototype).filter(m => m !== 'constructor');
      console.log('   Methods:', methods);
    }
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 5. Test adaptiveStrategySelection
  console.log('\n5️⃣ adaptiveStrategySelection:');
  try {
    const { adaptiveStrategySelection } = nativeBinding;
    console.log('   Type:', typeof adaptiveStrategySelection);

    const result = await adaptiveStrategySelection('BTCUSDT', '{}');
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    console.log('   Result:', JSON.stringify(parsed, null, 2).slice(0, 500));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 6. Test recommendStrategy
  console.log('\n6️⃣ recommendStrategy:');
  try {
    const { recommendStrategy } = nativeBinding;
    console.log('   Type:', typeof recommendStrategy);

    const result = await recommendStrategy('BTCUSDT', 'bullish');
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    console.log('   Result:', JSON.stringify(parsed, null, 2).slice(0, 500));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 7. Test optimizeParameters
  console.log('\n7️⃣ optimizeParameters:');
  try {
    const { optimizeParameters } = nativeBinding;
    console.log('   Type:', typeof optimizeParameters);

    const config = {
      strategy: 'momentum',
      symbol: 'BTCUSDT',
      iterations: 10
    };
    const result = await optimizeParameters(JSON.stringify(config));
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    console.log('   Result:', JSON.stringify(parsed, null, 2).slice(0, 500));
  } catch (e) {
    console.log('   Error:', e.message);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🔍 COMPLETE');
  console.log('═'.repeat(60));
}

main().catch(console.error);
