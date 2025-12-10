/**
 * Test StrategyRunner signal generation
 */

const core = require('@neural-trader/core');
const { StrategyRunner, calculateSma, calculateRsi } = core;

async function main() {
  console.log('═'.repeat(60));
  console.log('🔬 Testing StrategyRunner Signal Generation');
  console.log('═'.repeat(60));

  const sr = new StrategyRunner();

  // Add mean reversion strategy
  console.log('\n1️⃣ Adding strategies...');
  sr.addMeanReversionStrategy({
    name: 'mr_btc',
    symbols: ['BTCUSDT'],
    parameters: JSON.stringify({
      lookbackPeriod: 20,
      entryThreshold: 2.0,
      exitThreshold: 0.5
    })
  });
  console.log('   ✅ Mean reversion added');

  // List strategies
  console.log('\n2️⃣ Listing strategies:');
  const strategies = await sr.listStrategies();
  console.log('   ', strategies);

  // Create sample price data
  console.log('\n3️⃣ Generating sample data...');
  const closes = [];
  let price = 100000;
  for (let i = 0; i < 100; i++) {
    price += (Math.random() - 0.5) * 1000;
    closes.push(price);
  }
  console.log(`   ${closes.length} prices, last: ${closes[closes.length-1].toFixed(2)}`);

  // Test calculateSma and calculateRsi directly
  console.log('\n4️⃣ Testing technical indicators:');
  const sma = calculateSma(closes, 20);
  console.log('   SMA(20) last 3:', sma.slice(-3).map(v => v?.toFixed(2)));

  const rsi = calculateRsi(closes, 14);
  console.log('   RSI(14) last 3:', rsi.slice(-3).map(v => v?.toFixed(2)));

  // Try generateSignals with different formats
  console.log('\n5️⃣ Testing generateSignals:');

  // Format 1: Object with symbol and bars
  console.log('\n   Format 1: Object with bars array');
  try {
    const bars = closes.map((c, i) => ({
      timestamp: Date.now() - (100 - i) * 3600000,
      open: c - 50,
      high: c + 100,
      low: c - 100,
      close: c,
      volume: 1000
    }));

    const signals = await sr.generateSignals({
      symbol: 'BTCUSDT',
      bars: bars
    });
    console.log('   Result:', signals);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // Format 2: Direct bars array
  console.log('\n   Format 2: Direct bars array');
  try {
    const bars = closes.map((c, i) => ({
      timestamp: Date.now() - (100 - i) * 3600000,
      open: c - 50,
      high: c + 100,
      low: c - 100,
      close: c,
      volume: 1000
    }));

    const signals = await sr.generateSignals(bars);
    console.log('   Result:', signals);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // Format 3: Flat array
  console.log('\n   Format 3: Flat numbers array');
  try {
    const flatData = [];
    closes.forEach((c, i) => {
      flatData.push(Date.now() - (100 - i) * 3600000);
      flatData.push(c - 50); // open
      flatData.push(c + 100); // high
      flatData.push(c - 100); // low
      flatData.push(c); // close
      flatData.push(1000); // volume
    });

    const signals = await sr.generateSignals(flatData);
    console.log('   Result:', signals);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // Format 4: String BTCUSDT
  console.log('\n   Format 4: Just symbol string');
  try {
    const signals = await sr.generateSignals('BTCUSDT');
    console.log('   Result:', signals);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  console.log('\n═'.repeat(60));
}

main().catch(console.error);
