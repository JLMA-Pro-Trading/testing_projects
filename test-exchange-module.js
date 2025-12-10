#!/usr/bin/env node

/**
 * Test script for the Binance Exchange connector module
 * Run with: node test-exchange-module.js
 */

const BinanceExchange = require('./src/exchange.js');

async function testExchangeModule() {
  console.log('=== Testing Binance Exchange Connector Module ===\n');

  try {
    // Initialize exchange
    console.log('1. Initializing exchange...');
    const exchange = new BinanceExchange();
    console.log('✓ Exchange initialized successfully\n');

    // Test public endpoint (no auth required)
    console.log('2. Testing getCurrentPrice (public endpoint)...');
    const price = await exchange.getCurrentPrice('BTCUSDT');
    console.log('✓ Current BTC price:', price);
    console.log('');

    // Test authenticated endpoint - account balance
    console.log('3. Testing getAccountBalance (authenticated)...');
    const balance = await exchange.getAccountBalance();
    console.log('✓ Account balance retrieved:');
    const usdtBalance = balance.find(b => b.asset === 'USDT');
    if (usdtBalance) {
      console.log(`   USDT: ${usdtBalance.balance} (Available: ${usdtBalance.availableBalance})`);
    } else {
      console.log('   Balance data:', balance.slice(0, 3));
    }
    console.log('');

    // Test position endpoint
    console.log('4. Testing getPosition...');
    const positions = await exchange.getPosition('BTCUSDT');
    console.log('✓ Position info retrieved:');
    const btcPosition = positions.find(p => p.symbol === 'BTCUSDT');
    if (btcPosition) {
      console.log(`   Symbol: ${btcPosition.symbol}`);
      console.log(`   Position Amount: ${btcPosition.positionAmt}`);
      console.log(`   Entry Price: ${btcPosition.entryPrice}`);
      console.log(`   Unrealized PnL: ${btcPosition.unRealizedProfit}`);
    }
    console.log('');

    // Test open orders
    console.log('5. Testing getOpenOrders...');
    const openOrders = await exchange.getOpenOrders('BTCUSDT');
    console.log('✓ Open orders retrieved:', openOrders.length, 'orders');
    if (openOrders.length > 0) {
      console.log('   First order:', openOrders[0]);
    }
    console.log('');

    console.log('=== All Tests Passed! ===');
    console.log('\nThe exchange module is working correctly with Binance Testnet API.');
    console.log('\nYou can now use it in your trading bot with:');
    console.log('  const BinanceExchange = require("./src/exchange.js");');
    console.log('  const exchange = new BinanceExchange();');
    console.log('  await exchange.placeMarketOrder("BTCUSDT", "BUY", 0.001);');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nMake sure you have set the environment variables:');
    console.error('  export BINANCE_DEMO_API_KEY="your_api_key"');
    console.error('  export BINANCE_DEMO_SECRET="your_secret_key"');
    process.exit(1);
  }
}

// Run tests
testExchangeModule();
