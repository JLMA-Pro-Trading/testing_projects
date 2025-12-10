# Binance Futures Exchange Connector Module

A complete Node.js module for interacting with Binance Futures Testnet API using curl via child_process.

## Location
`/home/user/testing_projects/src/exchange.js`

## Features

- ✅ HMAC SHA256 authentication
- ✅ Uses curl via child_process (avoids Node.js fetch DNS issues)
- ✅ Comprehensive error handling
- ✅ Support for all major trading operations
- ✅ Works with Binance Futures Testnet
- ✅ Clean, documented API

## Setup

### 1. Set Environment Variables

```bash
export BINANCE_DEMO_API_KEY="your_binance_testnet_api_key"
export BINANCE_DEMO_SECRET="your_binance_testnet_secret_key"
```

### 2. Import and Use

```javascript
const BinanceExchange = require('./src/exchange.js');
const exchange = new BinanceExchange();
```

## API Methods

### Constructor
```javascript
const exchange = new BinanceExchange();
```
Initializes the exchange connector with API credentials from environment variables.

### generateSignature(queryString)
```javascript
const signature = exchange.generateSignature('symbol=BTCUSDT&timestamp=1234567890');
```
Generates HMAC SHA256 signature for authenticated requests.

### getCurrentPrice(symbol)
```javascript
const price = await exchange.getCurrentPrice('BTCUSDT');
// Returns: { symbol: 'BTCUSDT', price: '92006.90', time: 1765369606621 }
```
Get current price for a symbol. **No authentication required.**

### getAccountBalance()
```javascript
const balance = await exchange.getAccountBalance();
// Returns: Array of balance objects
// [
//   {
//     "accountAlias": "xxx",
//     "asset": "USDT",
//     "balance": "10000.00000000",
//     "availableBalance": "10000.00000000",
//     "maxWithdrawAmount": "10000.00000000"
//   },
//   ...
// ]
```
Get all account balances.

### getPosition(symbol)
```javascript
// Get position for specific symbol
const positions = await exchange.getPosition('BTCUSDT');

// Get all positions
const allPositions = await exchange.getPosition();

// Returns: Array of position objects
// [
//   {
//     "symbol": "BTCUSDT",
//     "positionAmt": "0.001",
//     "entryPrice": "90000.0",
//     "unRealizedProfit": "2.006",
//     "leverage": "20",
//     ...
//   }
// ]
```
Get position information for a symbol or all positions.

### placeMarketOrder(symbol, side, quantity)
```javascript
const order = await exchange.placeMarketOrder('BTCUSDT', 'BUY', 0.001);

// Returns: Order object
// {
//   "orderId": 12345678,
//   "symbol": "BTCUSDT",
//   "status": "FILLED",
//   "side": "BUY",
//   "type": "MARKET",
//   "origQty": "0.001",
//   "executedQty": "0.001",
//   "avgPrice": "92000.00",
//   ...
// }
```
Place a market order (executes immediately at current market price).

**Parameters:**
- `symbol`: Trading pair (e.g., 'BTCUSDT')
- `side`: 'BUY' or 'SELL'
- `quantity`: Order size

### placeLimitOrder(symbol, side, price, quantity)
```javascript
const order = await exchange.placeLimitOrder('BTCUSDT', 'BUY', 90000, 0.001);

// Returns: Order object
// {
//   "orderId": 12345679,
//   "symbol": "BTCUSDT",
//   "status": "NEW",
//   "side": "BUY",
//   "type": "LIMIT",
//   "price": "90000.00",
//   "origQty": "0.001",
//   "timeInForce": "GTC",
//   ...
// }
```
Place a limit order (executes only at specified price or better).

**Parameters:**
- `symbol`: Trading pair (e.g., 'BTCUSDT')
- `side`: 'BUY' or 'SELL'
- `price`: Limit price
- `quantity`: Order size

### cancelOrder(symbol, orderId)
```javascript
const result = await exchange.cancelOrder('BTCUSDT', 12345679);

// Returns: Cancellation confirmation
// {
//   "orderId": 12345679,
//   "symbol": "BTCUSDT",
//   "status": "CANCELED",
//   ...
// }
```
Cancel an open order.

### getOpenOrders(symbol)
```javascript
// Get open orders for specific symbol
const orders = await exchange.getOpenOrders('BTCUSDT');

// Get all open orders
const allOrders = await exchange.getOpenOrders();

// Returns: Array of order objects
```
Get all open orders for a symbol or all open orders.

## Complete Trading Example

```javascript
const BinanceExchange = require('./src/exchange.js');

async function tradingBot() {
  const exchange = new BinanceExchange();

  try {
    // 1. Check balance
    const balance = await exchange.getAccountBalance();
    const usdt = balance.find(b => b.asset === 'USDT');
    console.log('Available USDT:', usdt.availableBalance);

    // 2. Get current price
    const priceData = await exchange.getCurrentPrice('BTCUSDT');
    const currentPrice = parseFloat(priceData.price);
    console.log('BTC Price:', currentPrice);

    // 3. Check existing position
    const positions = await exchange.getPosition('BTCUSDT');
    const position = positions.find(p => p.symbol === 'BTCUSDT');
    console.log('Position:', position.positionAmt);

    // 4. Place limit order (buy 1% below current price)
    const buyPrice = (currentPrice * 0.99).toFixed(2);
    const order = await exchange.placeLimitOrder('BTCUSDT', 'BUY', buyPrice, 0.001);
    console.log('Order placed:', order.orderId);

    // 5. Check open orders
    const openOrders = await exchange.getOpenOrders('BTCUSDT');
    console.log('Open orders:', openOrders.length);

    // 6. Cancel order if needed
    if (openOrders.length > 0) {
      await exchange.cancelOrder('BTCUSDT', openOrders[0].orderId);
      console.log('Order canceled');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

tradingBot();
```

## Error Handling

All methods include comprehensive error handling:

```javascript
try {
  const order = await exchange.placeMarketOrder('BTCUSDT', 'BUY', 0.001);
} catch (error) {
  console.error('Failed to place order:', error.message);
  // Error message will include Binance API error details
}
```

Common errors:
- `API credentials not found in environment variables` - Set BINANCE_DEMO_API_KEY and BINANCE_DEMO_SECRET
- `Invalid API-key, IP, or permissions for action` - Check API key and make sure it's from Binance Futures Testnet
- `Binance API Error: ...` - Specific error from Binance API (insufficient balance, invalid symbol, etc.)

## Testing

Run the included test script:

```bash
node test-exchange-module.js
```

This will test:
1. Module initialization
2. Public endpoint (getCurrentPrice)
3. Authenticated endpoints (balance, position, orders)

## Files

- `/home/user/testing_projects/src/exchange.js` - Main module
- `/home/user/testing_projects/test-exchange-module.js` - Test script
- `/home/user/testing_projects/exchange-usage-example.js` - Usage examples

## Technical Details

### Authentication
- Uses HMAC SHA256 signature with API secret
- Signature is generated from query string including timestamp
- All authenticated requests include:
  - `timestamp` parameter (current time in milliseconds)
  - `signature` parameter (HMAC SHA256 hash)
  - `X-MBX-APIKEY` header (API key)

### API Base URL
- Binance Futures Testnet: `https://testnet.binancefuture.com`

### Request Methods
- Public endpoints: GET without authentication
- Authenticated GET: Balance, positions, open orders
- Authenticated POST: Place orders
- Authenticated DELETE: Cancel orders

### Dependencies
- `crypto` - Built-in Node.js module for HMAC SHA256
- `child_process` - Built-in Node.js module for executing curl
- `util` - Built-in Node.js module for promisifying exec

No external npm packages required!

## Important Notes

1. **Testnet Only**: This module is configured for Binance Futures Testnet. For production use, change the base URL.

2. **Rate Limits**: Binance has rate limits. The module doesn't include rate limiting - implement it in your trading logic.

3. **Order Quantities**: Make sure your order quantities meet Binance's minimum requirements for each symbol.

4. **Time Synchronization**: Binance requires timestamps within 5000ms of server time. Ensure your system clock is synchronized.

5. **Position Mode**: The module assumes hedge mode is disabled (default). For hedge mode, you'll need to add `positionSide` parameter.

## Integration with Your Trading Bot

```javascript
// In your trading bot main file:
const BinanceExchange = require('./src/exchange.js');

class TradingBot {
  constructor() {
    this.exchange = new BinanceExchange();
  }

  async executeTrade(signal) {
    if (signal.action === 'BUY') {
      return await this.exchange.placeMarketOrder(
        signal.symbol,
        'BUY',
        signal.quantity
      );
    } else if (signal.action === 'SELL') {
      return await this.exchange.placeMarketOrder(
        signal.symbol,
        'SELL',
        signal.quantity
      );
    }
  }

  async getPortfolioValue() {
    const balance = await this.exchange.getAccountBalance();
    const positions = await this.exchange.getPosition();
    // Calculate total portfolio value...
  }
}

module.exports = TradingBot;
```

## Support

For Binance API documentation:
- https://binance-docs.github.io/apidocs/futures/en/

For issues with this module:
- Check environment variables are set correctly
- Verify API keys are from Binance Futures Testnet
- Check Binance API status
- Review error messages for specific issues
