# Exchange Module Quick Start

## 1. Setup (One-time)

```bash
# Set environment variables (add to your ~/.bashrc or ~/.zshrc)
export BINANCE_DEMO_API_KEY="your_api_key_here"
export BINANCE_DEMO_SECRET="your_secret_key_here"
```

## 2. Basic Usage

```javascript
const BinanceExchange = require('./src/exchange.js');
const exchange = new BinanceExchange();

// Get current price (no auth needed)
const price = await exchange.getCurrentPrice('BTCUSDT');
console.log(price.price);

// Get account balance
const balance = await exchange.getAccountBalance();
console.log(balance);

// Place market order
const order = await exchange.placeMarketOrder('BTCUSDT', 'BUY', 0.001);
console.log(order);
```

## 3. All Available Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `getCurrentPrice(symbol)` | symbol | Get current price (public) |
| `getAccountBalance()` | - | Get all balances |
| `getPosition(symbol)` | symbol (optional) | Get position(s) |
| `placeMarketOrder(symbol, side, qty)` | symbol, 'BUY'/'SELL', quantity | Market order |
| `placeLimitOrder(symbol, side, price, qty)` | symbol, 'BUY'/'SELL', price, quantity | Limit order |
| `cancelOrder(symbol, orderId)` | symbol, orderId | Cancel order |
| `getOpenOrders(symbol)` | symbol (optional) | Get open orders |
| `generateSignature(queryString)` | queryString | Generate HMAC signature |

## 4. Test

```bash
# Run test script
node test-exchange-module.js

# Run usage examples
node exchange-usage-example.js
```

## 5. Integration Example

```javascript
const BinanceExchange = require('./src/exchange.js');

class MyTradingBot {
  constructor() {
    this.exchange = new BinanceExchange();
  }

  async run() {
    // Get price
    const { price } = await this.exchange.getCurrentPrice('BTCUSDT');

    // Check balance
    const balance = await this.exchange.getAccountBalance();
    const usdt = balance.find(b => b.asset === 'USDT');

    // Place order if conditions met
    if (parseFloat(usdt.availableBalance) > 100) {
      await this.exchange.placeMarketOrder('BTCUSDT', 'BUY', 0.001);
    }
  }
}

const bot = new MyTradingBot();
bot.run().catch(console.error);
```

## Files Created

✅ `/home/user/testing_projects/src/exchange.js` - Main module
✅ `/home/user/testing_projects/test-exchange-module.js` - Test script
✅ `/home/user/testing_projects/exchange-usage-example.js` - Examples
✅ `/home/user/testing_projects/EXCHANGE_MODULE_README.md` - Full documentation
✅ `/home/user/testing_projects/EXCHANGE_QUICK_START.md` - This file

## Key Features

- ✅ HMAC SHA256 authentication
- ✅ Uses curl (no DNS issues)
- ✅ All major trading operations
- ✅ Comprehensive error handling
- ✅ Works with Binance Futures Testnet
- ✅ Zero external dependencies

## Common Issues

**"API credentials not found"**
→ Set environment variables: `BINANCE_DEMO_API_KEY` and `BINANCE_DEMO_SECRET`

**"Invalid API-key, IP, or permissions"**
→ Check you're using Binance Futures Testnet API keys

**"Insufficient margin"**
→ Check your testnet account balance

## Next Steps

1. ✅ Set environment variables
2. ✅ Run test script: `node test-exchange-module.js`
3. ✅ Review examples: `node exchange-usage-example.js`
4. ✅ Integrate into your trading bot
5. ✅ Read full docs: `EXCHANGE_MODULE_README.md`
