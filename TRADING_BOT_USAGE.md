# Trading Bot Usage Guide

## Overview

The trading bot orchestrator (`src/trading-bot.js`) integrates all components for live trading on Binance Futures Testnet.

## Architecture

### Components

1. **ExchangeConnector** (`src/exchange.js`)
   - Connects to Binance Futures Testnet API
   - Handles order execution (market, limit orders)
   - Fetches account balance and positions
   - Uses curl for reliable connectivity

2. **PositionManager** (`src/position-manager.js`)
   - Tracks open positions (LONG/SHORT)
   - Calculates unrealized P&L
   - Manages position lifecycle

3. **PnLTracker** (`src/pnl-tracker.js`)
   - Records completed trades
   - Calculates performance metrics
   - Tracks equity curve

4. **RiskManager** (`src/risk-manager.js`)
   - Validates trades before execution
   - Enforces position size limits
   - Manages stop loss and take profit
   - Monitors drawdown

5. **ML Strategy** (integrated from `src/main.js`)
   - Ridge/Elastic Net ensemble model
   - Feature engineering (20 features)
   - Adaptive strategy combining ML + technical indicators

## Prerequisites

### 1. Set up Binance Testnet API Keys

```bash
# Get keys from: https://testnet.binancefuture.com/
export BINANCE_DEMO_API_KEY="your_api_key_here"
export BINANCE_DEMO_SECRET="your_secret_key_here"
```

See `BINANCE_SETUP_GUIDE.md` for detailed setup instructions.

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Configuration

Check `config.json` for trading parameters:

```json
{
  "trading": {
    "symbols": ["BTCUSDT"],
    "interval": "1m",
    "strategy": "adaptive"
  },
  "risk": {
    "max_position_size": 0.1,        // Max 10% of equity per trade
    "stop_loss_pct": 0.02,           // 2% stop loss
    "take_profit_pct": 0.04,         // 4% take profit
    "max_drawdown": 0.10             // 10% max drawdown
  }
}
```

## Usage Modes

### 1. Test Connection (Recommended First Step)

```bash
# Test your API credentials
./test-binance-api.sh
```

Expected output:
```
✓ Ping successful
✓ Server time: 1671090801999
✓ Balance retrieved successfully
  USDT Balance: 10000.00000000
```

### 2. Single Iteration Mode (`--once`)

Run one complete trading cycle and exit. Perfect for testing:

```bash
node src/trading-bot.js --once
```

This will:
1. Initialize account (fetch balance)
2. Fetch 1000 latest candles
3. Train ML model
4. Calculate indicators
5. Generate trading signal
6. Check risk management
7. Execute trade if signal is valid
8. Display status

### 3. Live Trading Mode (`--live`)

Run continuous trading loop (checks every 60 seconds):

```bash
node src/trading-bot.js --live
```

Press `Ctrl+C` to stop gracefully.

**What it does:**
- Fetches latest market data every minute
- Generates trading signals using ML + technical analysis
- Manages open positions (stop loss, take profit)
- Executes trades on Binance Testnet
- Logs performance metrics

### 4. Status Mode (`--status`)

Display current trading status without executing trades:

```bash
node src/trading-bot.js --status
```

Shows:
- Account balance and equity
- Open positions
- Trading performance (win rate, P&L, profit factor)

## Trading Flow

### Step-by-Step Process

1. **Initialization**
   - Connect to Binance Testnet
   - Fetch account balance
   - Initialize components (PositionManager, PnLTracker, RiskManager)

2. **Data Collection**
   - Fetch 1000 latest 1-minute candles
   - Calculate technical indicators (RSI, SMA, volatility, volume)

3. **Model Training** (first run only)
   - Extract features from historical data
   - Train ensemble model (Ridge + Elastic Net)
   - Feature selection (top 12 features)

4. **Signal Generation**
   - Calculate ML prediction (future price movement)
   - Evaluate momentum strategy
   - Evaluate mean reversion strategy
   - Combine signals (50% ML, 25% momentum, 25% mean reversion)

5. **Risk Validation**
   - Check position size limits
   - Verify equity is sufficient
   - Ensure no conflicting positions

6. **Trade Execution**
   - Place market order on Binance Testnet
   - Update position manager
   - Set stop loss and take profit levels

7. **Position Management**
   - Monitor price every 60 seconds
   - Check stop loss trigger
   - Check take profit trigger
   - Close position if triggered

8. **Performance Tracking**
   - Record completed trades
   - Update P&L tracker
   - Calculate metrics (win rate, profit factor)

## Risk Management

The bot implements multiple layers of risk control:

### Position Sizing
- Maximum 10% of equity per trade (configurable)
- Calculated based on current account balance
- Adjusted for leverage (default: 1x)

### Stop Loss
- Default: 2% from entry price
- Automatically triggered when price moves against position
- LONG: Stops if price drops 2% below entry
- SHORT: Stops if price rises 2% above entry

### Take Profit
- Default: 4% from entry price
- Automatically triggered when profit target reached
- LONG: Takes profit if price rises 4% above entry
- SHORT: Takes profit if price drops 4% below entry

### Emergency Exit Conditions
- Max drawdown exceeded (>10%)
- 5+ consecutive losing trades
- Extreme volatility (>10%)
- Critical equity loss (>50% of initial)

## Example Output

### Single Iteration (`--once`)

```
============================================================
🤖 Trading Bot - Single Iteration
============================================================

💰 Initial Balance: $10000.00

📊 Fetching latest BTCUSDT data...
   ✓ Fetched 1000 candles

🧠 Training ML Model...
   Training samples: 925
   ✓ Model trained successfully

💲 Current Price: $95432.50

🚦 Signal: BUY (Confidence: 65%)
   ML Prediction: +0.0042%

📤 Executing BUY order...
   Size: 0.010000 BTC
   Price: $95432.50
   Value: $954.33
   ✓ Order filled: 12345678
   Fill price: $95433.20

============================================================
📊 TRADING BOT STATUS
============================================================

💰 Account:
   Initial Capital: $10000.00
   Current Equity: $10000.00
   Return: +0.00%

📈 Position:
   Side: LONG
   Size: 0.010000 BTC
   Entry: $95433.20

📊 Performance:
   Total Trades: 0
   Win Rate: 0.0%
   Total P&L: +$0.00
   Commissions: $0.00
============================================================
```

### Live Mode (`--live`)

```
============================================================
🤖 Trading Bot - LIVE MODE
============================================================
Symbol: BTCUSDT
Interval: 1m (checking every 60 seconds)
Press Ctrl+C to stop

💰 Initial Balance: $10000.00

📊 Fetching initial data...
   ✓ Fetched 1000 candles

🧠 Training ML Model...
   ✓ Model trained successfully

------------------------------------------------------------
⏰ 12/10/2025, 3:45:00 PM
💲 Price: $95500.00
🚦 Signal: HOLD (0%)
   🟢 Unrealized P&L: +$0.67 (+0.07%)
⏳ Waiting 60 seconds...

------------------------------------------------------------
⏰ 12/10/2025, 3:46:00 PM
💲 Price: $95600.00
🚦 Signal: HOLD (0%)
   🟢 Unrealized P&L: +$1.67 (+0.17%)
⏳ Waiting 60 seconds...

------------------------------------------------------------
⏰ 12/10/2025, 3:47:00 PM
💲 Price: $99500.00
🚦 Signal: HOLD (0%)

✅ Take Profit triggered!

📤 Closing LONG position (TAKE_PROFIT)...
   ✓ Order filled: 12345679
   🟢 P&L: +$40.67 (+4.26%)
   Equity: $10040.67
⏳ Waiting 60 seconds...
```

## Configuration Options

### Trading Parameters (`config.json`)

```json
{
  "trading": {
    "symbols": ["BTCUSDT"],           // Trading pair
    "interval": "1m",                 // Candle interval (1m, 5m, 15m, 1h)
    "strategy": "adaptive",           // Strategy type
    "parameters": {
      "momentum_threshold": 0.002,    // Momentum signal threshold
      "mean_reversion_threshold": 0.003,
      "rsi_oversold": 25,             // RSI oversold level
      "rsi_overbought": 75,           // RSI overbought level
      "window_size": 15               // ML feature window (minutes for 1m)
    }
  },
  "prediction": {
    "enabled": true,                  // Use ML predictions
    "horizon": 5,                     // Predict 5 candles ahead
    "confidence": 0.90,               // Confidence level
    "min_signal_strength": 0.0005     // Minimum prediction to act on
  },
  "risk": {
    "max_position_size": 0.1,         // Max 10% of equity per trade
    "max_portfolio_risk": 0.02,       // Max 2% portfolio risk
    "stop_loss_pct": 0.02,            // 2% stop loss
    "take_profit_pct": 0.04,          // 4% take profit
    "max_drawdown": 0.10,             // 10% max drawdown
    "leverage": 1                     // Leverage multiplier
  }
}
```

## Troubleshooting

### "Invalid API-key" Error (-2015)

**Solution:** Set up Binance Testnet credentials properly.

```bash
# Generate keys at: https://testnet.binancefuture.com/
export BINANCE_DEMO_API_KEY="your_key"
export BINANCE_DEMO_SECRET="your_secret"

# Verify
./test-binance-api.sh
```

See `BINANCE_SETUP_GUIDE.md` for details.

### "Insufficient balance" Error

**Issue:** Not enough USDT to place order.

**Solution:**
- Testnet accounts start with 10,000 USDT
- Check balance: `./test-binance-api.sh`
- Reduce `max_position_size` in config.json

### "Model not trained" Error

**Issue:** Bot trying to predict before model is trained.

**Solution:** Bot auto-trains on first run. If error persists:
```bash
# Increase training data
node src/trading-bot.js --once
```

### Connection Timeouts

**Issue:** Network connectivity problems.

**Solution:**
- Check internet connection
- Verify Binance Testnet is accessible: `curl https://testnet.binancefuture.com/fapi/v1/ping`
- Bot uses curl for reliability, but may need proxy settings

## Safety Notes

### Testnet vs Mainnet

**This bot uses TESTNET only:**
- Trades with fake money
- No real financial risk
- Base URL: `https://testnet.binancefuture.com`

**DO NOT use mainnet credentials** without:
1. Extensive testing on testnet (weeks/months)
2. Proven strategy performance
3. Proper risk management verification
4. Small initial capital
5. Full understanding of the code

### Risk Warnings

Even on testnet:
- Test thoroughly before increasing position sizes
- Monitor bot behavior regularly
- Understand the strategy logic
- Be prepared for losses (even with fake money, it's learning)

### Code Modifications

Before modifying:
- Understand the risk management flow
- Test changes in `--once` mode first
- Never disable risk checks
- Keep stop losses enabled

## Files Reference

- **Main orchestrator:** `/home/user/testing_projects/src/trading-bot.js`
- **Exchange API:** `/home/user/testing_projects/src/exchange.js`
- **Position tracking:** `/home/user/testing_projects/src/position-manager.js`
- **P&L tracking:** `/home/user/testing_projects/src/pnl-tracker.js`
- **Risk management:** `/home/user/testing_projects/src/risk-manager.js`
- **ML strategy:** `/home/user/testing_projects/src/main.js`
- **Configuration:** `/home/user/testing_projects/config.json`

## Next Steps

1. **Verify Setup**
   ```bash
   ./test-binance-api.sh
   ```

2. **Test Single Run**
   ```bash
   node src/trading-bot.js --once
   ```

3. **Monitor Live Trading** (in a screen/tmux session)
   ```bash
   node src/trading-bot.js --live
   ```

4. **Analyze Performance**
   ```bash
   node src/trading-bot.js --status
   ```

5. **Optimize Strategy**
   - Adjust parameters in `config.json`
   - Test with different intervals (1m, 5m, 15m)
   - Tune risk management settings

## Support

- **Setup Guide:** `BINANCE_SETUP_GUIDE.md`
- **Implementation Details:** `TRADING_IMPLEMENTATION_SUMMARY.md`
- **Quick Reference:** `QUICK_REFERENCE.md`
- **API Spec:** `binance-futures-trading-spec.md`

---

**Happy Trading! Remember: Perfect your strategy on testnet before considering real money.**
