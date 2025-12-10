# Binance Futures Testnet Trading API - Complete Technical Specification

## Base URL
```
https://testnet.binancefuture.com
```

## Authentication

All TRADE and USER_DATA endpoints require authentication using:
- **API Key**: Passed in HTTP header `X-MBX-APIKEY`
- **Signature**: HMAC SHA256 signature of query parameters
- **Timestamp**: Current time in milliseconds (must be within server time ±5000ms)

### Environment Variables
```bash
$BINANCE_DEMO_API_KEY  # Your testnet API key
$BINANCE_DEMO_SECRET   # Your testnet secret key
```

---

## 1. API Endpoints

### 1.1 New Order (POST /fapi/v1/order)

**Purpose**: Place a new order (market, limit, stop, etc.)

**Endpoint**: `POST /fapi/v1/order`

**Security**: TRADE (requires signature)

**Weight**: 1

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | STRING | YES | Trading pair (e.g., BTCUSDT) |
| side | ENUM | YES | BUY or SELL |
| type | ENUM | YES | MARKET, LIMIT, STOP, TAKE_PROFIT, etc. |
| quantity | DECIMAL | NO | Order quantity (required for MARKET orders) |
| quoteOrderQty | DECIMAL | NO | Quote asset quantity (alternative to quantity) |
| price | DECIMAL | NO | Order price (required for LIMIT orders) |
| timeInForce | ENUM | NO | GTC, IOC, FOK (required for LIMIT orders) |
| reduceOnly | BOOLEAN | NO | true or false. Default false |
| newClientOrderId | STRING | NO | Unique order ID (auto-generated if not sent) |
| stopPrice | DECIMAL | NO | Used with STOP/TAKE_PROFIT orders |
| activationPrice | DECIMAL | NO | Used with TRAILING_STOP_MARKET orders |
| callbackRate | DECIMAL | NO | Used with TRAILING_STOP_MARKET orders |
| workingType | ENUM | NO | stopPrice triggered by: MARK_PRICE or CONTRACT_PRICE |
| priceProtect | BOOLEAN | NO | Default FALSE |
| newOrderRespType | ENUM | NO | ACK, RESULT, or FULL (default) |
| recvWindow | LONG | NO | Request validity window (max 60000ms) |
| timestamp | LONG | YES | Current timestamp in milliseconds |
| signature | STRING | YES | HMAC SHA256 signature |

**Market Order Example**:
```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "MARKET",
  "quantity": "0.001",
  "timestamp": 1671090801999,
  "signature": "..."
}
```

**Response** (FULL):
```json
{
  "orderId": 22542179,
  "symbol": "BTCUSDT",
  "status": "FILLED",
  "clientOrderId": "autoId12345",
  "price": "0",
  "avgPrice": "42000.00",
  "origQty": "0.001",
  "executedQty": "0.001",
  "cumQuote": "42.00000",
  "timeInForce": "GTC",
  "type": "MARKET",
  "reduceOnly": false,
  "closePosition": false,
  "side": "BUY",
  "positionSide": "BOTH",
  "stopPrice": "0",
  "workingType": "CONTRACT_PRICE",
  "priceProtect": false,
  "origType": "MARKET",
  "updateTime": 1671090802000
}
```

---

### 1.2 Account Information (GET /fapi/v2/account)

**Purpose**: Get current account information including balances and positions

**Endpoint**: `GET /fapi/v2/account`

**Security**: USER_DATA (requires signature)

**Weight**: 5

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| recvWindow | LONG | NO | Request validity window |
| timestamp | LONG | YES | Current timestamp in milliseconds |
| signature | STRING | YES | HMAC SHA256 signature |

**Response**:
```json
{
  "feeTier": 0,
  "canTrade": true,
  "canDeposit": true,
  "canWithdraw": true,
  "updateTime": 0,
  "totalInitialMargin": "0.00000000",
  "totalMaintMargin": "0.00000000",
  "totalWalletBalance": "10000.00000000",
  "totalUnrealizedProfit": "0.00000000",
  "totalMarginBalance": "10000.00000000",
  "totalPositionInitialMargin": "0.00000000",
  "totalOpenOrderInitialMargin": "0.00000000",
  "totalCrossWalletBalance": "10000.00000000",
  "totalCrossUnPnl": "0.00000000",
  "availableBalance": "10000.00000000",
  "maxWithdrawAmount": "10000.00000000",
  "assets": [
    {
      "asset": "USDT",
      "walletBalance": "10000.00000000",
      "unrealizedProfit": "0.00000000",
      "marginBalance": "10000.00000000",
      "maintMargin": "0.00000000",
      "initialMargin": "0.00000000",
      "positionInitialMargin": "0.00000000",
      "openOrderInitialMargin": "0.00000000",
      "crossWalletBalance": "10000.00000000",
      "crossUnPnl": "0.00000000",
      "availableBalance": "10000.00000000",
      "maxWithdrawAmount": "10000.00000000",
      "marginAvailable": true,
      "updateTime": 1625474304765
    }
  ],
  "positions": [
    {
      "symbol": "BTCUSDT",
      "initialMargin": "0",
      "maintMargin": "0",
      "unrealizedProfit": "0.00000000",
      "positionInitialMargin": "0",
      "openOrderInitialMargin": "0",
      "leverage": "20",
      "isolated": false,
      "entryPrice": "0.0",
      "maxNotional": "250000",
      "positionSide": "BOTH",
      "positionAmt": "0.000",
      "updateTime": 0
    }
  ]
}
```

---

### 1.3 Balance Information (GET /fapi/v2/balance)

**Purpose**: Get current asset balances

**Endpoint**: `GET /fapi/v2/balance`

**Security**: USER_DATA (requires signature)

**Weight**: 1

**Note**: V1 endpoint is retired. Must use V2.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| recvWindow | LONG | NO | Request validity window |
| timestamp | LONG | YES | Current timestamp in milliseconds |
| signature | STRING | YES | HMAC SHA256 signature |

**Response**:
```json
[
  {
    "accountAlias": "SgsR",
    "asset": "USDT",
    "balance": "10000.00000000",
    "crossWalletBalance": "10000.00000000",
    "crossUnPnl": "0.00000000",
    "availableBalance": "10000.00000000",
    "maxWithdrawAmount": "10000.00000000",
    "marginAvailable": true,
    "updateTime": 1625474304765
  }
]
```

---

### 1.4 Position Information (GET /fapi/v2/positionRisk)

**Purpose**: Get current position information

**Endpoint**: `GET /fapi/v2/positionRisk`

**Security**: USER_DATA (requires signature)

**Weight**: 5 (for all symbols), 1 (for a single symbol)

**Note**: V1 endpoint is retired. Must use V2.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | STRING | NO | Trading pair (omit to get all positions) |
| recvWindow | LONG | NO | Request validity window |
| timestamp | LONG | YES | Current timestamp in milliseconds |
| signature | STRING | YES | HMAC SHA256 signature |

**Response**:
```json
[
  {
    "entryPrice": "0.0",
    "marginType": "cross",
    "isAutoAddMargin": "false",
    "isolatedMargin": "0.00000000",
    "leverage": "20",
    "liquidationPrice": "0",
    "markPrice": "42000.00000000",
    "maxNotionalValue": "250000",
    "positionAmt": "0.000",
    "notional": "0",
    "isolatedWallet": "0",
    "symbol": "BTCUSDT",
    "unRealizedProfit": "0.00000000",
    "positionSide": "BOTH",
    "updateTime": 1625474304765
  }
]
```

---

### 1.5 Cancel Order (DELETE /fapi/v1/order)

**Purpose**: Cancel an active order

**Endpoint**: `DELETE /fapi/v1/order`

**Security**: TRADE (requires signature)

**Weight**: 1

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | STRING | YES | Trading pair |
| orderId | LONG | NO | System order ID (use orderId or origClientOrderId) |
| origClientOrderId | STRING | NO | Client order ID |
| recvWindow | LONG | NO | Request validity window |
| timestamp | LONG | YES | Current timestamp in milliseconds |
| signature | STRING | YES | HMAC SHA256 signature |

**Response**:
```json
{
  "orderId": 22542179,
  "symbol": "BTCUSDT",
  "status": "CANCELED",
  "clientOrderId": "autoId12345",
  "price": "42000",
  "avgPrice": "0.00",
  "origQty": "0.001",
  "executedQty": "0.000",
  "cumQuote": "0",
  "timeInForce": "GTC",
  "type": "LIMIT",
  "reduceOnly": false,
  "closePosition": false,
  "side": "BUY",
  "positionSide": "BOTH",
  "stopPrice": "0",
  "workingType": "CONTRACT_PRICE",
  "priceProtect": false,
  "origType": "LIMIT",
  "updateTime": 1671090802000
}
```

---

## 2. HMAC SHA256 Signature Generation

### 2.1 Signature Process

1. **Create query string**: Concatenate all parameters in alphabetical order (except `signature`)
2. **Generate HMAC**: Use HMAC SHA256 with your secret key
3. **Append signature**: Add the signature to the query string

### 2.2 Bash/OpenSSL Example

```bash
# Step 1: Create timestamp
TIMESTAMP=$(date +%s000)

# Step 2: Create query string (alphabetically sorted, no signature yet)
QUERY_STRING="recvWindow=5000&timestamp=${TIMESTAMP}"

# Step 3: Generate signature
SIGNATURE=$(echo -n "${QUERY_STRING}" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}')

# Step 4: Append signature to query string
FULL_QUERY="${QUERY_STRING}&signature=${SIGNATURE}"

# Step 5: Make request
curl -H "X-MBX-APIKEY: ${BINANCE_DEMO_API_KEY}" \
  "https://testnet.binancefuture.com/fapi/v2/balance?${FULL_QUERY}"
```

### 2.3 Market Order Example

```bash
# Parameters for BUY market order
TIMESTAMP=$(date +%s000)
SYMBOL="BTCUSDT"
SIDE="BUY"
TYPE="MARKET"
QUANTITY="0.001"

# Create query string (alphabetically sorted)
QUERY_STRING="quantity=${QUANTITY}&side=${SIDE}&symbol=${SYMBOL}&timestamp=${TIMESTAMP}&type=${TYPE}"

# Generate signature
SIGNATURE=$(echo -n "${QUERY_STRING}" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}')

# Make request
curl -X POST \
  -H "X-MBX-APIKEY: ${BINANCE_DEMO_API_KEY}" \
  "https://testnet.binancefuture.com/fapi/v1/order?${QUERY_STRING}&signature=${SIGNATURE}"
```

### 2.4 Important Notes

- **Timestamp**: Must be in milliseconds (multiply Unix timestamp by 1000)
- **Parameter order**: The order of parameters in the signature calculation matters - they should be in the order they appear in the query string
- **Character encoding**: The signature should NOT be URL encoded when generating the HMAC, but the final signature parameter should be included as-is in the URL
- **Secret key**: Never expose your secret key in logs or client-side code
- **recvWindow**: Optional parameter (default 5000ms) - defines how long the request is valid after the timestamp

---

## 3. Working Curl Examples

### 3.1 Check Account Balance

```bash
#!/bin/bash

# Get current timestamp in milliseconds
TIMESTAMP=$(date +%s000)

# Create query string
QUERY_STRING="timestamp=${TIMESTAMP}"

# Generate HMAC SHA256 signature
SIGNATURE=$(echo -n "${QUERY_STRING}" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}')

# Make request
curl -H "X-MBX-APIKEY: ${BINANCE_DEMO_API_KEY}" \
  "https://testnet.binancefuture.com/fapi/v2/balance?${QUERY_STRING}&signature=${SIGNATURE}"
```

### 3.2 Get Current Positions

```bash
#!/bin/bash

TIMESTAMP=$(date +%s000)
SYMBOL="BTCUSDT"

# Query string with symbol
QUERY_STRING="symbol=${SYMBOL}&timestamp=${TIMESTAMP}"

# Generate signature
SIGNATURE=$(echo -n "${QUERY_STRING}" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}')

# Make request
curl -H "X-MBX-APIKEY: ${BINANCE_DEMO_API_KEY}" \
  "https://testnet.binancefuture.com/fapi/v2/positionRisk?${QUERY_STRING}&signature=${SIGNATURE}"
```

### 3.3 Place BUY Market Order for BTCUSDT

```bash
#!/bin/bash

TIMESTAMP=$(date +%s000)

# Order parameters (alphabetically sorted)
QUERY_STRING="quantity=0.001&side=BUY&symbol=BTCUSDT&timestamp=${TIMESTAMP}&type=MARKET"

# Generate signature
SIGNATURE=$(echo -n "${QUERY_STRING}" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}')

# Make POST request
curl -X POST \
  -H "X-MBX-APIKEY: ${BINANCE_DEMO_API_KEY}" \
  "https://testnet.binancefuture.com/fapi/v1/order?${QUERY_STRING}&signature=${SIGNATURE}"
```

### 3.4 Place SELL Market Order

```bash
#!/bin/bash

TIMESTAMP=$(date +%s000)

# Order parameters
QUERY_STRING="quantity=0.001&side=SELL&symbol=BTCUSDT&timestamp=${TIMESTAMP}&type=MARKET"

# Generate signature
SIGNATURE=$(echo -n "${QUERY_STRING}" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}')

# Make POST request
curl -X POST \
  -H "X-MBX-APIKEY: ${BINANCE_DEMO_API_KEY}" \
  "https://testnet.binancefuture.com/fapi/v1/order?${QUERY_STRING}&signature=${SIGNATURE}"
```

### 3.5 Get Account Information

```bash
#!/bin/bash

TIMESTAMP=$(date +%s000)
QUERY_STRING="timestamp=${TIMESTAMP}"

SIGNATURE=$(echo -n "${QUERY_STRING}" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}')

curl -H "X-MBX-APIKEY: ${BINANCE_DEMO_API_KEY}" \
  "https://testnet.binancefuture.com/fapi/v2/account?${QUERY_STRING}&signature=${SIGNATURE}"
```

---

## 4. Rate Limits

### 4.1 IP Rate Limits

| Limit Type | Default Limit | Interval | Response Header |
|------------|---------------|----------|-----------------|
| REQUEST_WEIGHT | 2,400 | 1 minute | X-MBX-USED-WEIGHT-1M |
| ORDERS | 1,200 | 1 minute | X-MBX-ORDER-COUNT-1M |
| ORDERS | 300 | 10 seconds | X-MBX-ORDER-COUNT-10S |

### 4.2 Endpoint Weights

| Endpoint | Weight |
|----------|--------|
| POST /fapi/v1/order | 1 |
| GET /fapi/v2/balance | 1 |
| GET /fapi/v2/account | 5 |
| GET /fapi/v2/positionRisk | 5 (all symbols), 1 (single symbol) |
| DELETE /fapi/v1/order | 1 |

### 4.3 Rate Limit Violations

- **HTTP 429**: Rate limit exceeded - back off and retry with exponential backoff
- **HTTP 418**: IP banned for repeated violations (2 minutes to 3 days)

### 4.4 Best Practices

1. Monitor response headers (`X-MBX-USED-WEIGHT-1M`, `X-MBX-ORDER-COUNT-1M`)
2. Implement exponential backoff when receiving 429 errors
3. Use WebSocket streams for real-time data instead of polling REST endpoints
4. Batch requests when possible
5. Cache exchange info and only refresh periodically

---

## 5. Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -1000 | UNKNOWN | An unknown error occurred |
| -1001 | DISCONNECTED | Internal error; unable to process your request |
| -1002 | UNAUTHORIZED | Invalid API key, IP, or permissions |
| -1003 | TOO_MANY_REQUESTS | Too many requests; breaking the rate limit |
| -1007 | TIMEOUT | Request timeout |
| -1021 | TIMESTAMP_OUT_OF_SYNC | Timestamp for this request is outside of the recvWindow |
| -1022 | INVALID_SIGNATURE | Signature for this request is not valid |
| -2010 | NEW_ORDER_REJECTED | Order would immediately trigger |
| -2011 | CANCEL_REJECTED | Order cancel rejected |
| -2013 | NO_SUCH_ORDER | Order does not exist |
| -2014 | BAD_API_KEY_FMT | API key format invalid |
| -2015 | REJECTED_MBX_KEY | Invalid API key, IP, or permissions |
| -4000 | INVALID_ORDER_STATUS | Invalid order status |
| -4001 | PRICE_LESS_THAN_ZERO | Price less than 0 |
| -4002 | PRICE_GREATER_THAN_MAX | Price greater than max price |
| -4003 | QTY_LESS_THAN_ZERO | Quantity less than zero |
| -4004 | QTY_LESS_THAN_MIN | Quantity less than min quantity |
| -4005 | QTY_GREATER_THAN_MAX | Quantity greater than max quantity |

---

## 6. Testing Recommendations

### 6.1 Connection Test
First, test a public endpoint (no auth required):
```bash
curl https://testnet.binancefuture.com/fapi/v1/ping
# Response: {}
```

### 6.2 Server Time Test
Check server time to ensure your timestamps are correct:
```bash
curl https://testnet.binancefuture.com/fapi/v1/time
# Response: {"serverTime": 1671090801999}
```

### 6.3 Signature Test
Test your signature generation with a simple authenticated endpoint:
```bash
# Get balance (requires signature)
TIMESTAMP=$(date +%s000)
QUERY_STRING="timestamp=${TIMESTAMP}"
SIGNATURE=$(echo -n "${QUERY_STRING}" | openssl dgst -sha256 -hmac "${BINANCE_DEMO_SECRET}" | awk '{print $2}')
curl -H "X-MBX-APIKEY: ${BINANCE_DEMO_API_KEY}" \
  "https://testnet.binancefuture.com/fapi/v2/balance?${QUERY_STRING}&signature=${SIGNATURE}"
```

### 6.4 Paper Trading Flow
1. Check account balance
2. Get current BTC price from exchange info or ticker
3. Calculate order quantity within your risk parameters
4. Place market order
5. Verify position was opened
6. Monitor position
7. Close position with opposite order
8. Verify final balance

---

## 7. JavaScript/Node.js Implementation Example

```javascript
const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = 'https://testnet.binancefuture.com';
const API_KEY = process.env.BINANCE_DEMO_API_KEY;
const SECRET_KEY = process.env.BINANCE_DEMO_SECRET;

// Generate HMAC SHA256 signature
function generateSignature(queryString) {
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(queryString)
    .digest('hex');
}

// Make authenticated request
async function authenticatedRequest(method, endpoint, params = {}) {
  // Add timestamp
  params.timestamp = Date.now();

  // Create query string (sorted by key)
  const queryString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  // Generate signature
  const signature = generateSignature(queryString);

  // Make request
  const url = `${BASE_URL}${endpoint}?${queryString}&signature=${signature}`;

  const config = {
    method,
    url,
    headers: {
      'X-MBX-APIKEY': API_KEY
    }
  };

  const response = await axios(config);
  return response.data;
}

// Get account balance
async function getBalance() {
  return authenticatedRequest('GET', '/fapi/v2/balance');
}

// Get positions
async function getPositions(symbol = null) {
  const params = symbol ? { symbol } : {};
  return authenticatedRequest('GET', '/fapi/v2/positionRisk', params);
}

// Place market order
async function placeMarketOrder(symbol, side, quantity) {
  const params = {
    symbol,
    side,      // 'BUY' or 'SELL'
    type: 'MARKET',
    quantity: quantity.toString()
  };
  return authenticatedRequest('POST', '/fapi/v1/order', params);
}

// Cancel order
async function cancelOrder(symbol, orderId) {
  const params = {
    symbol,
    orderId
  };
  return authenticatedRequest('DELETE', '/fapi/v1/order', params);
}

// Example usage
async function main() {
  try {
    // Check balance
    const balance = await getBalance();
    console.log('Balance:', balance);

    // Place buy order
    const order = await placeMarketOrder('BTCUSDT', 'BUY', 0.001);
    console.log('Order placed:', order);

    // Check positions
    const positions = await getPositions('BTCUSDT');
    console.log('Positions:', positions);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

module.exports = {
  getBalance,
  getPositions,
  placeMarketOrder,
  cancelOrder
};
```

---

## 8. Common Pitfalls & Solutions

### 8.1 Timestamp Issues
**Problem**: `-1021 TIMESTAMP_OUT_OF_SYNC`
**Solution**:
- Ensure your system time is synchronized (use NTP)
- Use server time from `/fapi/v1/time` endpoint
- Increase `recvWindow` parameter (max 60000ms)

### 8.2 Signature Issues
**Problem**: `-1022 INVALID_SIGNATURE`
**Solutions**:
- Verify query string is exactly what you're signing (no extra spaces)
- Ensure parameters are in the correct order
- Check that secret key is correct
- Don't URL encode the query string before signing
- The signature itself should be appended as-is (it's already hex)

### 8.3 Quantity Precision
**Problem**: Order rejected due to quantity precision
**Solution**:
- Check symbol info from `/fapi/v1/exchangeInfo`
- Use correct `quantityPrecision` for the symbol
- Example: BTCUSDT requires 3 decimal places (0.001)

### 8.4 Insufficient Balance
**Problem**: `-2019 INSUFFICIENT_BALANCE`
**Solution**:
- Check available balance before placing orders
- Account for leverage settings
- Consider existing positions and open orders

---

## 9. Additional Resources

### Official Documentation
- [Binance Futures API Docs](https://developers.binance.com/docs/derivatives)
- [Binance Testnet](https://testnet.binancefuture.com/)
- [Binance API Signature Examples](https://github.com/binance/binance-signature-examples)

### Community Resources
- [Binance Developer Community](https://dev.binance.vision/)
- [python-binance Library](https://github.com/sammchardy/python-binance)
- [node-binance-api](https://www.npmjs.com/package/node-binance-api)

---

## 10. Quick Reference Card

### Essential URLs
```
Testnet Base:      https://testnet.binancefuture.com
Testnet Account:   https://testnet.binancefuture.com/
Production Base:   https://fapi.binance.com
```

### Key Headers
```
X-MBX-APIKEY: <your-api-key>
```

### Quick Signature Generation
```bash
SIGNATURE=$(echo -n "QUERY_STRING" | openssl dgst -sha256 -hmac "${SECRET}" | awk '{print $2}')
```

### Order Types
- MARKET: Execute immediately at best available price
- LIMIT: Execute at specified price or better (requires timeInForce)
- STOP: Stop loss order
- TAKE_PROFIT: Take profit order
- STOP_MARKET: Stop loss market order
- TAKE_PROFIT_MARKET: Take profit market order

### Time In Force (for LIMIT orders)
- GTC: Good Till Cancel
- IOC: Immediate Or Cancel
- FOK: Fill Or Kill

---

**Document Version**: 1.0
**Last Updated**: 2025-12-10
**Testnet Base URL**: https://testnet.binancefuture.com
**API Version**: FAPI v1/v2
