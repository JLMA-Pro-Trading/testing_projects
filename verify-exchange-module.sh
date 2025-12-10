#!/bin/bash

echo "=== Exchange Module Verification ==="
echo ""

# Check if module exists
if [ -f "src/exchange.js" ]; then
    echo "✅ Module file exists: src/exchange.js"
    echo "   Lines of code: $(wc -l < src/exchange.js)"
else
    echo "❌ Module file not found"
    exit 1
fi

# Check for required methods
echo ""
echo "Checking required methods:"
for method in "constructor" "generateSignature" "getAccountBalance" "getPosition" "placeMarketOrder" "placeLimitOrder" "cancelOrder" "getOpenOrders" "getCurrentPrice"; do
    if grep -q "$method" src/exchange.js; then
        echo "  ✅ $method"
    else
        echo "  ❌ $method - NOT FOUND"
    fi
done

# Check for required dependencies
echo ""
echo "Checking dependencies:"
for dep in "crypto" "child_process" "util"; do
    if grep -q "require('$dep')" src/exchange.js; then
        echo "  ✅ $dep"
    else
        echo "  ❌ $dep - NOT FOUND"
    fi
done

# Check for proper export
echo ""
if grep -q "module.exports = BinanceExchange" src/exchange.js; then
    echo "✅ Module properly exported"
else
    echo "❌ Module export not found"
fi

# Check for HMAC SHA256
echo ""
if grep -q "createHmac('sha256'" src/exchange.js; then
    echo "✅ HMAC SHA256 authentication implemented"
else
    echo "❌ HMAC SHA256 not found"
fi

# Check for curl usage
echo ""
if grep -q "curl" src/exchange.js; then
    echo "✅ Using curl via child_process"
else
    echo "❌ curl usage not found"
fi

# Check for base URL
echo ""
if grep -q "testnet.binancefuture.com" src/exchange.js; then
    echo "✅ Correct base URL: https://testnet.binancefuture.com"
else
    echo "❌ Base URL not correct"
fi

# Check environment variables
echo ""
if grep -q "BINANCE_DEMO_API_KEY" src/exchange.js && grep -q "BINANCE_DEMO_SECRET" src/exchange.js; then
    echo "✅ Reading from correct environment variables"
else
    echo "❌ Environment variables not configured correctly"
fi

echo ""
echo "=== Verification Complete ==="
echo ""
echo "Test files available:"
[ -f "test-exchange-module.js" ] && echo "  ✅ test-exchange-module.js"
[ -f "exchange-usage-example.js" ] && echo "  ✅ exchange-usage-example.js"

echo ""
echo "Documentation files:"
[ -f "EXCHANGE_MODULE_README.md" ] && echo "  ✅ EXCHANGE_MODULE_README.md"
[ -f "EXCHANGE_QUICK_START.md" ] && echo "  ✅ EXCHANGE_QUICK_START.md"

echo ""
echo "To test the module, run:"
echo "  node test-exchange-module.js"
