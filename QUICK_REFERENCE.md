# Binance Futures Testnet - Quick Reference Card

## 🔗 Essential URLs

```
Testnet:       https://testnet.binancefuture.com
API Base:      https://testnet.binancefuture.com/fapi
Documentation: https://developers.binance.com/docs/derivatives
```

## 🔑 Authentication

```bash
# Header
X-MBX-APIKEY: ${BINANCE_DEMO_API_KEY}

# Signature (append to query string)
SIGNATURE=$(echo -n "QUERY_STRING" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}')

# Timestamp (always required for signed endpoints)
TIMESTAMP=$(date +%s000)
```

## 📊 Core Endpoints

### Account & Positions
```bash
# Balance
GET /fapi/v2/balance?timestamp=${TS}&signature=${SIG}

# Account Info
GET /fapi/v2/account?timestamp=${TS}&signature=${SIG}

# Positions
GET /fapi/v2/positionRisk?symbol=BTCUSDT&timestamp=${TS}&signature=${SIG}
```

### Orders
```bash
# Place Market Order
POST /fapi/v1/order?quantity=0.001&side=BUY&symbol=BTCUSDT&timestamp=${TS}&type=MARKET&signature=${SIG}

# Cancel Order
DELETE /fapi/v1/order?symbol=BTCUSDT&orderId=12345&timestamp=${TS}&signature=${SIG}

# Open Orders
GET /fapi/v1/openOrders?symbol=BTCUSDT&timestamp=${TS}&signature=${SIG}
```

### Market Data (Public - No Auth)
```bash
# Ping
GET /fapi/v1/ping

# Server Time
GET /fapi/v1/time

# Current Price
GET /fapi/v1/ticker/price?symbol=BTCUSDT

# Klines/Candles
GET /fapi/v1/klines?symbol=BTCUSDT&interval=1h&limit=100
```

## 🐍 Python Quick Start

```python
from binance_trading_client import BinanceFuturesClient

client = BinanceFuturesClient()

# Check balance
balance = client.get_balance()

# Get price
price = client.get_ticker_price('BTCUSDT')

# Place order
order = client.place_market_order('BTCUSDT', 'BUY', 0.001)

# Get position
position = client.get_position('BTCUSDT')

# Close position
client.close_position('BTCUSDT')
```

## 🔢 Order Parameters

### Market Order (BUY)
```
symbol:    BTCUSDT
side:      BUY
type:      MARKET
quantity:  0.001
timestamp: 1671090801999
signature: abc123...
```

### Limit Order (SELL)
```
symbol:       BTCUSDT
side:         SELL
type:         LIMIT
quantity:     0.001
price:        95000.00
timeInForce:  GTC
timestamp:    1671090801999
signature:    abc123...
```

## ⚠️ Common Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| -1021 | Timestamp out of sync | Sync system clock |
| -1022 | Invalid signature | Check secret key & query string |
| -2015 | Invalid API key | Regenerate keys on testnet |
| -4000 | Invalid order status | Check order parameters |
| 429 | Rate limit exceeded | Back off and retry |
| 418 | IP banned | Wait 2min-3days |

## ⚡ Rate Limits

```
REQUEST_WEIGHT: 2,400/minute
ORDERS:         1,200/minute
ORDERS:         300/10seconds
```

## 🎯 Order Types

```
MARKET              - Execute at best price immediately
LIMIT               - Execute at specific price or better
STOP                - Stop loss order
TAKE_PROFIT         - Take profit order
STOP_MARKET         - Stop market order
TAKE_PROFIT_MARKET  - Take profit market order
```

## ⏱️ Time In Force (for LIMIT)

```
GTC - Good Till Cancel
IOC - Immediate Or Cancel
FOK - Fill Or Kill
```

## 📏 Parameter Order Rules

Parameters must be in query string order when generating signature:
```bash
# Correct (alphabetical in this example)
quantity=0.001&side=BUY&symbol=BTCUSDT&timestamp=123&type=MARKET

# The signature is generated from this exact string
```

## 🧪 Testing Workflow

```bash
# 1. Test public endpoints
curl https://testnet.binancefuture.com/fapi/v1/ping

# 2. Test signature generation
./test-binance-api.sh

# 3. Test Python client
python3 binance-trading-client.py

# 4. Place test order (uncomment in test script)
# (Manual step - edit test-binance-api.sh)
```

## 🔒 Security Checklist

- [ ] Never commit API keys to Git
- [ ] Use environment variables
- [ ] Don't log secret keys
- [ ] Test on testnet first
- [ ] Use minimal position sizes
- [ ] Implement stop losses
- [ ] Add rate limit handling
- [ ] Enable IP restrictions (mainnet)

## 📁 Files Reference

```
binance-futures-trading-spec.md  - Complete API specification
binance-trading-client.py        - Python implementation
test-binance-api.sh              - Automated testing
BINANCE_SETUP_GUIDE.md           - Setup instructions
TRADING_IMPLEMENTATION_SUMMARY.md - Full documentation
QUICK_REFERENCE.md               - This file
```

## 🚀 One-Liner Examples

### Check if API is working
```bash
curl https://testnet.binancefuture.com/fapi/v1/time
```

### Get BTC price
```bash
curl "https://testnet.binancefuture.com/fapi/v1/ticker/price?symbol=BTCUSDT"
```

### Generate signature
```bash
echo -n "timestamp=$(date +%s000)" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}'
```

### Full balance check
```bash
TS=$(date +%s000) QS="timestamp=${TS}" SIG=$(echo -n "${QS}" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}') && curl -H "X-MBX-APIKEY: ${BINANCE_DEMO_API_KEY}" "https://testnet.binancefuture.com/fapi/v2/balance?${QS}&signature=${SIG}"
```

## 💡 Tips

1. **Always check server time first** - Prevents -1021 errors
2. **Use testnet liberally** - It's free and resets if needed
3. **Start with tiny quantities** - Even on testnet, practice good habits
4. **Monitor rate limit headers** - Prevents 429 errors
5. **Log everything** - Except secret keys
6. **Test error cases** - What happens when balance is 0?
7. **Use WebSockets for price data** - Saves REST rate limits

## 🆘 Quick Troubleshooting

**Problem: Can't authenticate**
→ Go to https://testnet.binancefuture.com/ and generate new keys

**Problem: Time sync errors**
→ Use server time: `curl https://testnet.binancefuture.com/fapi/v1/time`

**Problem: Order rejected**
→ Check symbol info: `curl "https://testnet.binancefuture.com/fapi/v1/exchangeInfo"`

**Problem: Rate limited**
→ Reduce request frequency and implement exponential backoff

---

**Last Updated**: 2025-12-10
**API Version**: FAPI v1/v2
**Testnet URL**: https://testnet.binancefuture.com
