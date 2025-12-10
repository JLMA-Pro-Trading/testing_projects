const core = require('@neural-trader/core');
const { calculateRsi, calculateSma } = core;
const config = require('./config.json');

// Fetch using curl
function curlFetch(url) {
  const { execSync } = require('child_process');
  const result = execSync(`curl -s --connect-timeout 15 "${url}"`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(result);
}

async function diagnose() {
  console.log('🔍 DIAGNOSING STRATEGY ISSUES\n');

  // Fetch recent data
  const url = 'https://testnet.binancefuture.com/fapi/v1/klines?symbol=BTCUSDT&interval=1m&limit=1000';
  const rawData = curlFetch(url);
  const candles = rawData.map(d => ({
    timestamp: d[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5])
  }));

  console.log(`Analyzing ${candles.length} 1-minute candles...\n`);

  // Calculate price movements
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    returns.push((candles[i].close - candles[i-1].close) / candles[i-1].close);
  }

  // Stats
  const avgReturn = returns.reduce((a,b) => a+b, 0) / returns.length;
  const maxReturn = Math.max(...returns);
  const minReturn = Math.min(...returns);
  const absReturns = returns.map(r => Math.abs(r));
  const avgAbsReturn = absReturns.reduce((a,b) => a+b, 0) / absReturns.length;

  console.log('📊 1-MINUTE PRICE MOVEMENT STATS:');
  console.log(`   Average Return: ${(avgReturn * 100).toFixed(4)}%`);
  console.log(`   Average |Return|: ${(avgAbsReturn * 100).toFixed(4)}%`);
  console.log(`   Max Return: ${(maxReturn * 100).toFixed(4)}%`);
  console.log(`   Min Return: ${(minReturn * 100).toFixed(4)}%`);

  // Count how many candles exceed thresholds
  const threshold = config.prediction.min_signal_strength; // 0.0005
  const aboveThreshold = returns.filter(r => Math.abs(r) > threshold).length;
  console.log(`\n   Returns > ${threshold * 100}%: ${aboveThreshold} / ${returns.length} (${(aboveThreshold/returns.length*100).toFixed(1)}%)`);

  // 15-minute returns (prediction horizon = 5 candles)
  const returns15 = [];
  for (let i = 15; i < candles.length; i++) {
    returns15.push((candles[i].close - candles[i-15].close) / candles[i-15].close);
  }
  const avgReturn15 = returns15.reduce((a,b) => a+b, 0) / returns15.length;
  const avgAbsReturn15 = returns15.map(r => Math.abs(r)).reduce((a,b) => a+b, 0) / returns15.length;

  console.log('\n📊 15-MINUTE PRICE MOVEMENT STATS:');
  console.log(`   Average Return: ${(avgReturn15 * 100).toFixed(4)}%`);
  console.log(`   Average |Return|: ${(avgAbsReturn15 * 100).toFixed(4)}%`);

  // RSI distribution
  const closes = candles.map(c => c.close);
  const rsi = calculateRsi(closes, 7);
  const oversold = rsi.filter(r => r < 25).length;
  const overbought = rsi.filter(r => r > 75).length;
  const neutral = rsi.length - oversold - overbought;

  console.log('\n📊 RSI(7) DISTRIBUTION:');
  console.log(`   Oversold (<25): ${oversold} (${(oversold/rsi.length*100).toFixed(1)}%)`);
  console.log(`   Neutral (25-75): ${neutral} (${(neutral/rsi.length*100).toFixed(1)}%)`);
  console.log(`   Overbought (>75): ${overbought} (${(overbought/rsi.length*100).toFixed(1)}%)`);

  // Problem identification
  console.log('\n' + '═'.repeat(50));
  console.log('🚨 IDENTIFIED PROBLEMS:');
  console.log('═'.repeat(50));

  console.log('\n1. THRESHOLD TOO HIGH FOR 1-MIN DATA');
  console.log(`   Current min_signal_strength: ${threshold * 100}%`);
  console.log(`   But average 1-min |return| is only: ${(avgAbsReturn * 100).toFixed(4)}%`);
  console.log(`   ML predictions will rarely exceed threshold!`);
  console.log(`   RECOMMENDATION: Lower to 0.0001 (0.01%)`);

  console.log('\n2. RSI THRESHOLDS TOO EXTREME');
  console.log(`   Current: oversold < 25, overbought > 75`);
  console.log(`   Only ${((oversold+overbought)/rsi.length*100).toFixed(1)}% of candles trigger RSI signals`);
  console.log(`   RECOMMENDATION: Use 35/65 for more signals`);

  console.log('\n3. COMBINED SCORE THRESHOLD');
  console.log(`   Current backtest requires combined score > 0.3`);
  console.log(`   With low confidence scores, this rarely triggers`);
  console.log(`   RECOMMENDATION: Lower to 0.15`);

  console.log('\n4. STOP LOSS / TAKE PROFIT FOR 1-MIN DATA');
  console.log(`   Current: SL 2%, TP 4%`);
  console.log(`   Average 15-min move: ${(avgAbsReturn15 * 100).toFixed(3)}%`);
  console.log(`   SL/TP are way too wide for 1-min scalping`);
  console.log(`   RECOMMENDATION: SL 0.3%, TP 0.6% (or trail stops)`);
}

diagnose().catch(console.error);
