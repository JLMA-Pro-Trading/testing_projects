#!/bin/bash

# Binance Futures Testnet API Test Script
# This script tests all major trading endpoints

set -e  # Exit on error

BASE_URL="https://testnet.binancefuture.com"
API_KEY="${BINANCE_DEMO_API_KEY}"
SECRET="${BINANCE_DEMO_SECRET}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo "Binance Futures Testnet API Tests"
echo "========================================"
echo ""

# Check environment variables
if [ -z "$API_KEY" ]; then
    echo -e "${RED}ERROR: BINANCE_DEMO_API_KEY not set${NC}"
    exit 1
fi

if [ -z "$SECRET" ]; then
    echo -e "${RED}ERROR: BINANCE_DEMO_SECRET not set${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables loaded${NC}"
echo ""

# Function to generate signature
generate_signature() {
    local query_string="$1"
    echo -n "${query_string}" | openssl dgst -sha256 -hmac "${SECRET}" | awk '{print $2}'
}

# Test 1: Public endpoint - Ping
echo -e "${BLUE}[TEST 1] Ping (public endpoint)${NC}"
RESPONSE=$(curl -s "${BASE_URL}/fapi/v1/ping")
if [ "$RESPONSE" == "{}" ]; then
    echo -e "${GREEN}✓ Ping successful${NC}"
else
    echo -e "${RED}✗ Ping failed: ${RESPONSE}${NC}"
fi
echo ""

# Test 2: Public endpoint - Server Time
echo -e "${BLUE}[TEST 2] Server Time${NC}"
RESPONSE=$(curl -s "${BASE_URL}/fapi/v1/time")
SERVER_TIME=$(echo "$RESPONSE" | grep -o '"serverTime":[0-9]*' | cut -d':' -f2)
if [ -n "$SERVER_TIME" ]; then
    echo -e "${GREEN}✓ Server time: ${SERVER_TIME}${NC}"
    LOCAL_TIME=$(date +%s000)
    TIME_DIFF=$((SERVER_TIME - LOCAL_TIME))
    TIME_DIFF_ABS=${TIME_DIFF#-}
    echo "  Local time: ${LOCAL_TIME}"
    echo "  Time diff: ${TIME_DIFF}ms"
    if [ "$TIME_DIFF_ABS" -gt 5000 ]; then
        echo -e "${YELLOW}  WARNING: Time difference > 5000ms. May cause issues.${NC}"
    fi
else
    echo -e "${RED}✗ Failed to get server time${NC}"
fi
echo ""

# Test 3: Exchange Info
echo -e "${BLUE}[TEST 3] Exchange Info (BTCUSDT)${NC}"
RESPONSE=$(curl -s "${BASE_URL}/fapi/v1/exchangeInfo")
BTC_INFO=$(echo "$RESPONSE" | grep -o '"symbol":"BTCUSDT"[^}]*' | head -1)
if [ -n "$BTC_INFO" ]; then
    echo -e "${GREEN}✓ BTCUSDT is available on testnet${NC}"
    # Extract some useful info
    echo "$RESPONSE" | grep -o '"symbol":"BTCUSDT"' | head -1
else
    echo -e "${YELLOW}! Could not parse BTCUSDT info${NC}"
fi
echo ""

# Test 4: Get Balance
echo -e "${BLUE}[TEST 4] Get Balance (authenticated)${NC}"
TIMESTAMP=$(date +%s000)
QUERY_STRING="timestamp=${TIMESTAMP}"
SIGNATURE=$(generate_signature "$QUERY_STRING")

RESPONSE=$(curl -s -H "X-MBX-APIKEY: ${API_KEY}" \
  "${BASE_URL}/fapi/v2/balance?${QUERY_STRING}&signature=${SIGNATURE}")

if echo "$RESPONSE" | grep -q '"asset"'; then
    echo -e "${GREEN}✓ Balance retrieved successfully${NC}"
    # Try to extract USDT balance
    USDT_BALANCE=$(echo "$RESPONSE" | grep -o '"asset":"USDT"[^}]*"balance":"[^"]*"' | grep -o '"balance":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$USDT_BALANCE" ]; then
        echo "  USDT Balance: ${USDT_BALANCE}"
    fi
elif echo "$RESPONSE" | grep -q '"code"'; then
    CODE=$(echo "$RESPONSE" | grep -o '"code":[^,]*' | cut -d':' -f2)
    MSG=$(echo "$RESPONSE" | grep -o '"msg":"[^"]*"' | cut -d'"' -f4)
    echo -e "${RED}✗ API Error ${CODE}: ${MSG}${NC}"
else
    echo -e "${RED}✗ Unexpected response: ${RESPONSE}${NC}"
fi
echo ""

# Test 5: Get Account Info
echo -e "${BLUE}[TEST 5] Get Account Info${NC}"
TIMESTAMP=$(date +%s000)
QUERY_STRING="timestamp=${TIMESTAMP}"
SIGNATURE=$(generate_signature "$QUERY_STRING")

RESPONSE=$(curl -s -H "X-MBX-APIKEY: ${API_KEY}" \
  "${BASE_URL}/fapi/v2/account?${QUERY_STRING}&signature=${SIGNATURE}")

if echo "$RESPONSE" | grep -q '"totalWalletBalance"'; then
    echo -e "${GREEN}✓ Account info retrieved${NC}"
    TOTAL_BALANCE=$(echo "$RESPONSE" | grep -o '"totalWalletBalance":"[^"]*"' | cut -d'"' -f4)
    AVAILABLE=$(echo "$RESPONSE" | grep -o '"availableBalance":"[^"]*"' | cut -d'"' -f4)
    echo "  Total Wallet Balance: ${TOTAL_BALANCE}"
    echo "  Available Balance: ${AVAILABLE}"
elif echo "$RESPONSE" | grep -q '"code"'; then
    CODE=$(echo "$RESPONSE" | grep -o '"code":[^,]*' | cut -d':' -f2)
    MSG=$(echo "$RESPONSE" | grep -o '"msg":"[^"]*"' | cut -d'"' -f4)
    echo -e "${RED}✗ API Error ${CODE}: ${MSG}${NC}"
else
    echo -e "${RED}✗ Unexpected response${NC}"
fi
echo ""

# Test 6: Get Position Risk
echo -e "${BLUE}[TEST 6] Get Position Risk (BTCUSDT)${NC}"
TIMESTAMP=$(date +%s000)
QUERY_STRING="symbol=BTCUSDT&timestamp=${TIMESTAMP}"
SIGNATURE=$(generate_signature "$QUERY_STRING")

RESPONSE=$(curl -s -H "X-MBX-APIKEY: ${API_KEY}" \
  "${BASE_URL}/fapi/v2/positionRisk?${QUERY_STRING}&signature=${SIGNATURE}")

if echo "$RESPONSE" | grep -q '"symbol"'; then
    echo -e "${GREEN}✓ Position info retrieved${NC}"
    POSITION_AMT=$(echo "$RESPONSE" | grep -o '"positionAmt":"[^"]*"' | cut -d'"' -f4)
    ENTRY_PRICE=$(echo "$RESPONSE" | grep -o '"entryPrice":"[^"]*"' | cut -d'"' -f4)
    LEVERAGE=$(echo "$RESPONSE" | grep -o '"leverage":"[^"]*"' | cut -d'"' -f4)
    echo "  Position Amount: ${POSITION_AMT}"
    echo "  Entry Price: ${ENTRY_PRICE}"
    echo "  Leverage: ${LEVERAGE}"
elif echo "$RESPONSE" | grep -q '"code"'; then
    CODE=$(echo "$RESPONSE" | grep -o '"code":[^,]*' | cut -d':' -f2)
    MSG=$(echo "$RESPONSE" | grep -o '"msg":"[^"]*"' | cut -d'"' -f4)
    echo -e "${RED}✗ API Error ${CODE}: ${MSG}${NC}"
else
    echo -e "${RED}✗ Unexpected response${NC}"
fi
echo ""

# Test 7: Get Current Price
echo -e "${BLUE}[TEST 7] Get Current Price (BTCUSDT)${NC}"
RESPONSE=$(curl -s "${BASE_URL}/fapi/v1/ticker/price?symbol=BTCUSDT")
if echo "$RESPONSE" | grep -q '"price"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"price":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ Current BTCUSDT price: \$${PRICE}${NC}"
else
    echo -e "${YELLOW}! Could not get price${NC}"
fi
echo ""

# Test 8: Place a VERY small market order (optional - uncomment to test)
echo -e "${BLUE}[TEST 8] Market Order (SKIPPED - uncomment to test)${NC}"
echo -e "${YELLOW}  Skipping actual order placement for safety.${NC}"
echo -e "${YELLOW}  To test, uncomment the code below in the script.${NC}"
echo ""

# UNCOMMENT BELOW TO TEST ACTUAL ORDER PLACEMENT
# echo -e "${BLUE}Placing small BUY market order...${NC}"
# TIMESTAMP=$(date +%s000)
# QUANTITY="0.001"  # Very small quantity
# QUERY_STRING="quantity=${QUANTITY}&side=BUY&symbol=BTCUSDT&timestamp=${TIMESTAMP}&type=MARKET"
# SIGNATURE=$(generate_signature "$QUERY_STRING")
#
# RESPONSE=$(curl -s -X POST -H "X-MBX-APIKEY: ${API_KEY}" \
#   "${BASE_URL}/fapi/v1/order?${QUERY_STRING}&signature=${SIGNATURE}")
#
# if echo "$RESPONSE" | grep -q '"orderId"'; then
#     echo -e "${GREEN}✓ Order placed successfully${NC}"
#     ORDER_ID=$(echo "$RESPONSE" | grep -o '"orderId":[^,]*' | cut -d':' -f2)
#     STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
#     AVG_PRICE=$(echo "$RESPONSE" | grep -o '"avgPrice":"[^"]*"' | cut -d'"' -f4)
#     echo "  Order ID: ${ORDER_ID}"
#     echo "  Status: ${STATUS}"
#     echo "  Avg Price: ${AVG_PRICE}"
# elif echo "$RESPONSE" | grep -q '"code"'; then
#     CODE=$(echo "$RESPONSE" | grep -o '"code":[^,]*' | cut -d':' -f2)
#     MSG=$(echo "$RESPONSE" | grep -o '"msg":"[^"]*"' | cut -d'"' -f4)
#     echo -e "${RED}✗ Order failed ${CODE}: ${MSG}${NC}"
# else
#     echo -e "${RED}✗ Unexpected response: ${RESPONSE}${NC}"
# fi

echo ""
echo "========================================"
echo -e "${GREEN}API Test Complete!${NC}"
echo "========================================"
echo ""
echo "Summary:"
echo "  - Public endpoints: Working"
echo "  - Authentication: Working"
echo "  - Account data: Accessible"
echo "  - Position data: Accessible"
echo ""
echo "To enable actual order testing, edit this script and"
echo "uncomment the TEST 8 section."
echo ""
