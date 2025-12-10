#!/usr/bin/env node

/**
 * Usage examples for the Binance Exchange connector module
 * This demonstrates all available methods
 */

const BinanceExchange = require('./src/exchange.js');

async function examples() {
  // Initialize the exchange connector
  const exchange = new BinanceExchange();

  try {
    // ==========================================
    // 1. Get Current Price (Public, no auth)
    // ==========================================
    console.log('\n--- Get Current Price ---');
    const price = await exchange.getCurrentPrice('BTCUSDT');
    console.log('BTC Price:', price.price);

    // ==========================================
    // 2. Get Account Balance
    // ==========================================
    console.log('\n--- Get Account Balance ---');
    const balance = await exchange.getAccountBalance();
    balance.forEach(asset => {
      if (parseFloat(asset.balance) > 0) {
        console.log(`${asset.asset}: ${asset.balance} (Available: ${asset.availableBalance})`);
      }
    });

    // ==========================================
    // 3. Get Position Information
    // ==========================================
    console.log('\n--- Get Position for BTCUSDT ---');
    const positions = await exchange.getPosition('BTCUSDT');
    const btcPosition = positions.find(p => p.symbol === 'BTCUSDT');
    if (btcPosition) {
      console.log('Position Amount:', btcPosition.positionAmt);
      console.log('Entry Price:', btcPosition.entryPrice);
      console.log('Unrealized PnL:', btcPosition.unRealizedProfit);
    }

    // Get all positions (omit symbol parameter)
    // const allPositions = await exchange.getPosition();

    // ==========================================
    // 4. Place Market Order
    // ==========================================
    console.log('\n--- Place Market Order (Example - commented out) ---');
    // Uncomment to execute:
    // const marketOrder = await exchange.placeMarketOrder('BTCUSDT', 'BUY', 0.001);
    // console.log('Market Order:', marketOrder);
    console.log('// const order = await exchange.placeMarketOrder("BTCUSDT", "BUY", 0.001);');

    // ==========================================
    // 5. Place Limit Order
    // ==========================================
    console.log('\n--- Place Limit Order (Example - commented out) ---');
    // Uncomment to execute:
    // const currentPrice = parseFloat(price.price);
    // const limitPrice = (currentPrice * 0.95).toFixed(2); // 5% below current price
    // const limitOrder = await exchange.placeLimitOrder('BTCUSDT', 'BUY', limitPrice, 0.001);
    // console.log('Limit Order:', limitOrder);
    console.log('// const order = await exchange.placeLimitOrder("BTCUSDT", "BUY", 90000, 0.001);');

    // ==========================================
    // 6. Get Open Orders
    // ==========================================
    console.log('\n--- Get Open Orders ---');
    const openOrders = await exchange.getOpenOrders('BTCUSDT');
    console.log('Open Orders:', openOrders.length);
    openOrders.forEach(order => {
      console.log(`- Order ${order.orderId}: ${order.side} ${order.origQty} @ ${order.price} (${order.status})`);
    });

    // Get all open orders (omit symbol parameter)
    // const allOpenOrders = await exchange.getOpenOrders();

    // ==========================================
    // 7. Cancel Order
    // ==========================================
    console.log('\n--- Cancel Order (Example - commented out) ---');
    // Uncomment to execute (replace ORDER_ID with actual order ID):
    // if (openOrders.length > 0) {
    //   const orderToCancel = openOrders[0];
    //   const cancelResult = await exchange.cancelOrder('BTCUSDT', orderToCancel.orderId);
    //   console.log('Cancel Result:', cancelResult);
    // }
    console.log('// const result = await exchange.cancelOrder("BTCUSDT", ORDER_ID);');

    console.log('\n=== All Examples Complete ===\n');

  } catch (error) {
    console.error('\nError:', error.message);
    console.error('\nMake sure you have set the environment variables:');
    console.error('  export BINANCE_DEMO_API_KEY="your_api_key"');
    console.error('  export BINANCE_DEMO_SECRET="your_secret_key"');
  }
}

// ==========================================
// Trading Strategy Example
// ==========================================
async function tradingStrategyExample() {
  const exchange = new BinanceExchange();

  try {
    console.log('\n=== Trading Strategy Example ===\n');

    // 1. Check account balance
    const balance = await exchange.getAccountBalance();
    const usdtBalance = balance.find(b => b.asset === 'USDT');
    console.log('Available USDT:', usdtBalance.availableBalance);

    // 2. Get current price
    const priceData = await exchange.getCurrentPrice('BTCUSDT');
    const currentPrice = parseFloat(priceData.price);
    console.log('Current BTC Price:', currentPrice);

    // 3. Check existing position
    const positions = await exchange.getPosition('BTCUSDT');
    const position = positions.find(p => p.symbol === 'BTCUSDT');
    const positionSize = parseFloat(position.positionAmt);
    console.log('Current Position:', positionSize, 'BTC');

    // 4. Trading logic (example - DO NOT use real money without proper strategy!)
    if (positionSize === 0) {
      console.log('\nNo position - would place entry order here');
      // Example: Place limit order 1% below current price
      // const entryPrice = (currentPrice * 0.99).toFixed(2);
      // await exchange.placeLimitOrder('BTCUSDT', 'BUY', entryPrice, 0.001);
    } else if (positionSize > 0) {
      console.log('\nLong position exists - would check for exit conditions');
      // Example: Place take-profit order
      // const takeProfitPrice = (currentPrice * 1.02).toFixed(2); // 2% profit
      // await exchange.placeLimitOrder('BTCUSDT', 'SELL', takeProfitPrice, Math.abs(positionSize));
    } else {
      console.log('\nShort position exists - would check for exit conditions');
    }

    // 5. Check open orders
    const openOrders = await exchange.getOpenOrders('BTCUSDT');
    console.log('\nOpen Orders:', openOrders.length);

  } catch (error) {
    console.error('Strategy Error:', error.message);
  }
}

// Run examples
if (require.main === module) {
  examples().then(() => {
    console.log('\n--- Running Trading Strategy Example ---');
    return tradingStrategyExample();
  }).catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
}

module.exports = { examples, tradingStrategyExample };
