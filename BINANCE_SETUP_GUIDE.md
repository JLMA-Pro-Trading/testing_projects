# Binance Futures Testnet Setup Guide

## Getting Started with Testnet API Keys

The -2015 error ("Invalid API-key, IP, or permissions") means your API keys need to be properly configured on the testnet. Here's how to fix it:

### Step 1: Access Binance Futures Testnet

1. Go to: **https://testnet.binancefuture.com/**
2. Click "Log in" in the top right
3. Sign in with GitHub or Google (no Binance account needed for testnet)

### Step 2: Generate API Keys

1. After logging in, look for the **"API Key"** section on the dashboard
2. Click **"Generate HMAC_SHA256"** (this is the most common type)
3. You'll see two keys:
   - **API Key** (64 characters, like: `abcd1234...`)
   - **Secret Key** (64 characters, shown only once!)
4. **IMPORTANT**: Copy both keys immediately! The secret key won't be shown again.

### Step 3: Set Environment Variables

Update your environment variables with the new keys:

```bash
export BINANCE_DEMO_API_KEY="your_64_char_api_key_here"
export BINANCE_DEMO_SECRET="your_64_char_secret_key_here"
```

To make them persistent, add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Binance Futures Testnet API Keys
export BINANCE_DEMO_API_KEY="your_api_key"
export BINANCE_DEMO_SECRET="your_secret_key"
```

Then reload:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### Step 4: Verify Setup

Run the test script to verify everything works:

```bash
./test-binance-api.sh
```

Or use the Python client:

```bash
python3 binance-trading-client.py
```

### Step 5: Check API Key Permissions

Make sure your API key has the right permissions:

1. Go back to https://testnet.binancefuture.com/
2. Find your API key in the list
3. Check that these permissions are enabled:
   - ✓ **Enable Reading** (for account info, positions)
   - ✓ **Enable Futures** (required for trading)
   - ✓ **Enable Spot & Margin Trading** (if needed)

### Step 6: IP Restrictions (Optional)

If you have IP restrictions enabled:

1. Either **disable IP restrictions** for testnet (recommended)
2. Or add your current IP address to the whitelist

To check your IP:
```bash
curl ifconfig.me
```

---

## Common Issues & Solutions

### Issue 1: -2015 Error (Invalid API Key)

**Symptoms**:
```json
{"code":-2015,"msg":"Invalid API-key, IP, or permissions for action"}
```

**Solutions**:
1. Verify API keys are correctly set in environment variables
2. Regenerate keys on testnet website
3. Check API key has "Enable Futures" permission
4. Disable IP restrictions or add your IP to whitelist
5. Make sure you're using the **Futures Testnet** keys, not Spot Testnet

### Issue 2: -1022 Error (Invalid Signature)

**Symptoms**:
```json
{"code":-1022,"msg":"Signature for this request is not valid"}
```

**Solutions**:
1. Verify your secret key is correct
2. Check timestamp is within ±5000ms of server time
3. Ensure query string is signed exactly as sent
4. Don't URL encode before signing (but do send raw signature)

### Issue 3: -1021 Error (Timestamp Out of Sync)

**Symptoms**:
```json
{"code":-1021,"msg":"Timestamp for this request is outside of the recvWindow"}
```

**Solutions**:
1. Sync your system clock:
   ```bash
   sudo ntpdate -s time.nist.gov
   ```
2. Or use server time from API:
   ```bash
   curl https://testnet.binancefuture.com/fapi/v1/time
   ```
3. Increase `recvWindow` parameter (max 60000ms)

### Issue 4: Wrong Testnet

**Problem**: Using Spot Testnet keys on Futures Testnet

There are **different testnets** for different Binance services:
- **Futures Testnet**: https://testnet.binancefuture.com/ (← You want this one!)
- Spot Testnet: https://testnet.binance.vision/
- Options Testnet: https://testnet.binanceops.com/

Make sure you're using keys from the **Futures Testnet**.

---

## Quick Verification Checklist

Before running your trading bot, verify:

- [ ] Logged into https://testnet.binancefuture.com/
- [ ] Generated API keys (HMAC_SHA256 type)
- [ ] Copied both API key and Secret key
- [ ] Set environment variables (`BINANCE_DEMO_API_KEY`, `BINANCE_DEMO_SECRET`)
- [ ] API key has "Enable Futures" permission
- [ ] IP restrictions disabled or your IP whitelisted
- [ ] System time is synchronized
- [ ] Test script runs without -2015 error

---

## Testing Your Setup

### Test 1: Public Endpoints (No Auth)

```bash
# Should work without API keys
curl https://testnet.binancefuture.com/fapi/v1/ping
curl https://testnet.binancefuture.com/fapi/v1/time
curl "https://testnet.binancefuture.com/fapi/v1/ticker/price?symbol=BTCUSDT"
```

### Test 2: Authenticated Endpoints

```bash
# Run the test script
./test-binance-api.sh
```

Expected output:
```
✓ Ping successful
✓ Server time: 1671090801999
✓ BTCUSDT is available on testnet
✓ Balance retrieved successfully
  USDT Balance: 10000.00000000
✓ Account info retrieved
✓ Position info retrieved
```

### Test 3: Python Client

```bash
python3 binance-trading-client.py
```

### Test 4: Place Small Test Order

Once authenticated endpoints work, you can uncomment the order test in `test-binance-api.sh` or use Python:

```python
from binance_trading_client import BinanceFuturesClient

client = BinanceFuturesClient()

# Place a very small market order (testnet uses fake money!)
order = client.place_market_order(
    symbol='BTCUSDT',
    side='BUY',
    quantity=0.001  # 0.001 BTC
)

print(f"Order placed! ID: {order['orderId']}")
print(f"Status: {order['status']}")
print(f"Filled at: ${order['avgPrice']}")
```

---

## Testnet Features & Limitations

### What Works on Testnet:
- ✓ All order types (Market, Limit, Stop, etc.)
- ✓ Position management (Long/Short)
- ✓ Leverage up to 125x
- ✓ All trading pairs available on mainnet
- ✓ WebSocket streams
- ✓ Historical data (klines)
- ✓ Account management

### Testnet Limitations:
- Fake money (starts with 10,000 USDT usually)
- May have different liquidity than mainnet
- Occasionally reset without notice
- Some advanced features may be delayed
- Rate limits are generally the same as mainnet

### Starting Balance:
- Most accounts start with **10,000 USDT**
- If you run out, you can reset your account or create a new one
- No real money is ever involved

---

## Next Steps

Once your setup is verified:

1. **Explore the API**: Use the Python client to test different order types
2. **Implement your strategy**: Adapt the examples to your trading logic
3. **Paper trade**: Test your strategy thoroughly on testnet
4. **Monitor performance**: Track wins, losses, and edge cases
5. **Only after success on testnet**: Consider mainnet (with small amounts!)

---

## Resources

### Official Documentation
- **Futures Testnet**: https://testnet.binancefuture.com/
- **API Docs**: https://developers.binance.com/docs/derivatives
- **Signature Examples**: https://github.com/binance/binance-signature-examples

### Your Files
- **Complete Spec**: `binance-futures-trading-spec.md`
- **Test Script**: `test-binance-api.sh`
- **Python Client**: `binance-trading-client.py`
- **This Guide**: `BINANCE_SETUP_GUIDE.md`

### Community
- **Developer Forum**: https://dev.binance.vision/
- **GitHub Issues**: https://github.com/binance/binance-spot-api-docs/issues
- **Discord**: Various trading bot communities

---

## Security Reminders

Even though this is testnet with fake money, practice good security habits:

- ✓ Never commit API keys to Git
- ✓ Use environment variables, not hardcoded keys
- ✓ Rotate keys periodically
- ✓ Use IP restrictions on mainnet
- ✓ Test signature generation thoroughly
- ✓ Handle errors gracefully
- ✓ Log securely (don't log secret keys)

When you move to mainnet:
- Start with minimal funds
- Enable all security features (2FA, IP whitelist, withdraw whitelist)
- Use read-only keys for monitoring
- Keep trading keys on secure servers only
- Consider hardware security modules for production

---

**Good luck with your trading bot! Remember: Perfect it on testnet before risking real money.**
