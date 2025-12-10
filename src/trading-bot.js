#!/usr/bin/env node
/**
 * Trading Bot Orchestrator
 *
 * Orchestrates all components for live trading:
 * - ExchangeConnector: Binance Testnet API integration
 * - PositionManager: Track open positions
 * - PnLTracker: Track realized P&L
 * - RiskManager: Validate trades and manage risk
 * - ML Strategy: Neural network predictions + technical analysis
 *
 * Usage:
 *   node src/trading-bot.js --live        # Run continuous trading loop
 *   node src/trading-bot.js --once        # Run single iteration
 *   node src/trading-bot.js --status      # Show current status
 */

const ExchangeConnector = require('./exchange.js');
const PositionManager = require('./position-manager.js');
const PnLTracker = require('./pnl-tracker.js');
const RiskManager = require('./risk-manager.js');
const config = require('../config.json');
const { execSync } = require('child_process');

// Import strategy components from main.js
// We'll need to use these as utilities since main.js doesn't export them
const core = require('@neural-trader/core');
const { calculateRsi, calculateSma } = core;
const {
  DataPreprocessor,
  trainRidgeRegression,
  trainElasticNet,
  selectFeaturesByCorrelation,
  trainWeightedEnsemble
} = require('./regression');

/**
 * Trading Bot Class
 */
class TradingBot {
  constructor(botConfig) {
    this.config = botConfig || config;
    this.symbol = this.config.trading.symbols[0];
    this.interval = this.config.trading.interval;
    this.windowSize = this.config.trading.parameters.window_size || 15;

    // Initialize components
    console.log('Initializing Trading Bot...');
    console.log(`Symbol: ${this.symbol}, Interval: ${this.interval}`);

    this.exchange = new ExchangeConnector();
    this.positionManager = new PositionManager(0.0004); // 0.04% commission
    this.riskManager = new RiskManager(this.config);

    // P&L tracker - will initialize with account balance
    this.pnlTracker = null;

    // ML Model state
    this.ensemble = null;
    this.preprocessor = null;
    this.selectedFeatures = null;
    this.isModelTrained = false;

    // Trading state
    this.isRunning = false;
    this.peakEquity = 0;
    this.consecutiveLosses = 0;

    console.log('✓ Trading Bot initialized');
  }

  /**
   * Fetch latest candles from Binance
   * @param {number} count - Number of candles to fetch
   * @returns {Promise<Array>} Array of candle objects
   */
  async fetchLatestCandles(count = 1000) {
    try {
      const url = `${this.exchange.baseUrl}/fapi/v1/klines?symbol=${this.symbol}&interval=${this.interval}&limit=${count}`;

      const result = execSync(`curl -s "${url}"`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      });

      const rawData = JSON.parse(result);

      if (!Array.isArray(rawData)) {
        throw new Error('Invalid response from exchange');
      }

      const candles = rawData.map(d => ({
        timestamp: d[0],
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }));

      return candles;
    } catch (error) {
      throw new Error(`Failed to fetch candles: ${error.message}`);
    }
  }

  /**
   * Calculate technical indicators (from main.js)
   */
  calculateIndicators(candles) {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    const rsiPeriod = this.interval === '1m' ? 7 : 14;
    const rsi = calculateRsi(closes, rsiPeriod);

    const smaPeriodShort = this.interval === '1m' ? 5 : 20;
    const smaPeriodLong = this.interval === '1m' ? 15 : 50;
    const smaShort = calculateSma(closes, smaPeriodShort);
    const smaLong = calculateSma(closes, smaPeriodLong);

    const currentClose = closes[closes.length - 1];
    const currentRsi = rsi[rsi.length - 1] || 50;
    const currentSmaShort = smaShort[smaShort.length - 1] || currentClose;
    const currentSmaLong = smaLong[smaLong.length - 1] || currentClose;

    const returns1 = closes.length > 1 ? (currentClose - closes[closes.length - 2]) / closes[closes.length - 2] : 0;
    const lookbackPeriod = this.interval === '1m' ? 15 : 24;
    const returnsLong = closes.length > lookbackPeriod ?
      (currentClose - closes[closes.length - 1 - lookbackPeriod]) / closes[closes.length - 1 - lookbackPeriod] : 0;

    const volPeriod = this.interval === '1m' ? this.windowSize : 20;
    const recentReturns = [];
    for (let i = Math.max(1, closes.length - volPeriod); i < closes.length; i++) {
      recentReturns.push((closes[i] - closes[i-1]) / closes[i-1]);
    }
    const volatility = Math.sqrt(recentReturns.reduce((a, b) => a + b * b, 0) / recentReturns.length) || 0;

    const avgVolume = volumes.slice(-volPeriod).reduce((a, b) => a + b, 0) / volPeriod;
    const volumeRatio = volumes[volumes.length - 1] / avgVolume;

    return {
      price: currentClose,
      rsi: currentRsi,
      smaShort: currentSmaShort,
      smaLong: currentSmaLong,
      returns1,
      returnsLong,
      volatility,
      volumeRatio,
      trend: currentSmaShort > currentSmaLong ? 'bullish' : 'bearish',
      priceVsSma: (currentClose - currentSmaShort) / currentSmaShort
    };
  }

  /**
   * Extract features for ML model (from main.js)
   */
  extractFeatures(candles, index) {
    const minWindow = this.windowSize;
    if (index < minWindow) return null;

    const window = candles.slice(index - minWindow, index + 1);
    const closes = window.map(c => c.close);
    const volumes = window.map(c => c.volume);
    const highs = window.map(c => c.high);
    const lows = window.map(c => c.low);

    const features = [];
    const currentClose = closes[closes.length - 1];

    const returnPeriods = this.interval === '1m' ? [1, 2, 3, 5, 10, 15] : [1, 2, 5, 10, 20, 50];
    for (const period of returnPeriods) {
      if (closes.length > period) {
        features.push((currentClose - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]);
      } else {
        features.push(0);
      }
    }

    const rsiPeriod = this.interval === '1m' ? 7 : 14;
    const rsi = calculateRsi(closes, Math.min(rsiPeriod, closes.length - 1));
    features.push((rsi[rsi.length - 1] || 50) / 100);

    const smaPeriods = this.interval === '1m' ? [3, 5, 10] : [10, 20, 50];
    for (const p of smaPeriods) {
      const sma = calculateSma(closes, Math.min(p, closes.length));
      features.push(currentClose / (sma[sma.length - 1] || currentClose) - 1);
    }

    const returns = [];
    for (let i = 1; i < Math.min(minWindow, closes.length); i++) {
      returns.push((closes[closes.length - i] - closes[closes.length - i - 1]) / closes[closes.length - i - 1]);
    }
    const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdReturn = returns.length > 0 ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length) : 0;
    features.push(stdReturn);
    features.push(meanReturn);

    const volPeriod = Math.min(minWindow, volumes.length);
    const avgVol = volumes.slice(-volPeriod).reduce((a, b) => a + b, 0) / volPeriod;
    const shortVolPeriod = Math.min(3, volumes.length);
    const avgVolShort = volumes.slice(-shortVolPeriod).reduce((a, b) => a + b, 0) / shortVolPeriod;
    features.push(avgVol > 0 ? volumes[volumes.length - 1] / avgVol - 1 : 0);
    features.push(avgVol > 0 ? avgVolShort / avgVol - 1 : 0);

    const range = (highs[highs.length - 1] - lows[lows.length - 1]) / currentClose;
    const atrPeriod = Math.min(this.interval === '1m' ? 7 : 14, window.length);
    const atr = window.slice(-atrPeriod).reduce((sum, c) => sum + (c.high - c.low), 0) / atrPeriod / currentClose;
    features.push(range);
    features.push(atr);

    const trendPeriod = Math.min(5, highs.length - 1);
    let hhCount = 0, llCount = 0;
    for (let i = highs.length - trendPeriod; i < highs.length; i++) {
      if (i > 0 && highs[i] > highs[i - 1]) hhCount++;
      if (i > 0 && lows[i] < lows[i - 1]) llCount++;
    }
    features.push(trendPeriod > 0 ? (hhCount - llCount) / trendPeriod : 0);
    const compIdx = Math.min(minWindow - 1, closes.length - 1);
    features.push(closes[closes.length - 1] > closes[closes.length - 1 - compIdx] ? 1 : -1);

    const momentum = closes.length >= 3 ?
      (closes[closes.length - 1] - closes[closes.length - 3]) / closes[closes.length - 3] : 0;
    features.push(momentum);

    const accel = closes.length >= 5 ?
      ((closes[closes.length - 1] - closes[closes.length - 3]) -
       (closes[closes.length - 3] - closes[closes.length - 5])) / closes[closes.length - 5] : 0;
    features.push(accel);

    while (features.length < 20) {
      features.push(0);
    }

    return features.slice(0, 20);
  }

  /**
   * Train ML model (from main.js)
   */
  async trainModel(candles) {
    console.log('\n🧠 Training ML Model...');

    const featuresList = [];
    const targets = [];
    const horizon = this.config.prediction.horizon || 1;

    for (let i = 50; i < candles.length - horizon; i++) {
      const feat = this.extractFeatures(candles, i);
      if (feat) {
        featuresList.push(feat);
        const futureReturn = (candles[i + horizon].close - candles[i].close) / candles[i].close;
        targets.push(futureReturn);
      }
    }

    console.log(`   Training samples: ${targets.length}`);

    const splitIdx = Math.floor(featuresList.length * 0.8);
    const trainX = featuresList.slice(0, splitIdx);
    const trainY = targets.slice(0, splitIdx);
    const valX = featuresList.slice(splitIdx);
    const valY = targets.slice(splitIdx);

    this.preprocessor = new DataPreprocessor();
    this.preprocessor.fit(trainX);
    const trainXNorm = this.preprocessor.transform(trainX);
    const valXNorm = this.preprocessor.transform(valX);

    this.selectedFeatures = selectFeaturesByCorrelation(trainXNorm, trainY, 12);

    const trainXSelected = trainXNorm.map(row => this.selectedFeatures.map(idx => row[idx]));
    const valXSelected = valXNorm.map(row => this.selectedFeatures.map(idx => row[idx]));

    this.ensemble = trainWeightedEnsemble(trainXSelected, trainY, [
      { fn: trainRidgeRegression, lambda: 0.01, weight: 0.3 },
      { fn: trainRidgeRegression, lambda: 0.1, weight: 0.25 },
      { fn: trainElasticNet, lambda: 0.05, weight: 0.25 },
      { fn: trainElasticNet, lambda: 0.1, weight: 0.2 }
    ]);

    this.isModelTrained = true;
    console.log('   ✓ Model trained successfully');
  }

  /**
   * Get ML prediction (from main.js)
   */
  async getMLPrediction(candles) {
    if (!this.isModelTrained || !this.ensemble || !this.preprocessor || !this.selectedFeatures) {
      return null;
    }

    const features = this.extractFeatures(candles, candles.length - 1);
    if (!features) return null;

    try {
      const normalized = this.preprocessor.transform([features])[0];
      const selected = this.selectedFeatures.map(idx => normalized[idx]);
      const prediction = this.ensemble.predict(selected);

      let minPred = Infinity, maxPred = -Infinity;
      for (const { model } of this.ensemble.models) {
        let pred = model.bias;
        for (let j = 0; j < selected.length && j < model.weights.length; j++) {
          pred += model.weights[j] * selected[j];
        }
        minPred = Math.min(minPred, pred);
        maxPred = Math.max(maxPred, pred);
      }

      const uncertainty = Math.max(Math.abs(maxPred - minPred), Math.abs(prediction) * 0.3 + 0.001);

      return {
        prediction: prediction,
        lower: prediction - uncertainty,
        upper: prediction + uncertainty
      };
    } catch (e) {
      console.log('ML prediction error:', e.message);
      return null;
    }
  }

  /**
   * Generate trading signal using adaptive strategy (from main.js)
   */
  generateSignal(indicators, mlPrediction) {
    const params = this.config.trading.parameters;

    // Momentum strategy
    let momentum = { signal: 'HOLD', confidence: 0 };
    const confScale = this.interval === '1m' ? 100 : 10;
    if (indicators.returnsLong > params.momentum_threshold && indicators.rsi < params.rsi_overbought &&
        indicators.volumeRatio > 1.2 && indicators.trend === 'bullish') {
      momentum = { signal: 'BUY', confidence: Math.min(indicators.returnsLong * confScale, 1) };
    }
    if (indicators.returnsLong < -params.momentum_threshold && indicators.rsi > params.rsi_oversold &&
        indicators.volumeRatio > 1.2 && indicators.trend === 'bearish') {
      momentum = { signal: 'SELL', confidence: Math.min(Math.abs(indicators.returnsLong) * confScale, 1) };
    }

    // Mean reversion strategy
    let meanRev = { signal: 'HOLD', confidence: 0 };
    if (indicators.rsi < params.rsi_oversold && indicators.priceVsSma < -params.mean_reversion_threshold) {
      meanRev = { signal: 'BUY', confidence: (params.rsi_oversold - indicators.rsi) / params.rsi_oversold };
    }
    if (indicators.rsi > params.rsi_overbought && indicators.priceVsSma > params.mean_reversion_threshold) {
      meanRev = { signal: 'SELL', confidence: (indicators.rsi - params.rsi_overbought) / (100 - params.rsi_overbought) };
    }

    // ML signal
    let mlSignal = { signal: 'HOLD', confidence: 0 };
    if (mlPrediction && this.config.prediction.enabled) {
      const threshold = this.config.prediction.min_signal_strength || 0.002;
      if (mlPrediction.lower > threshold) {
        mlSignal = { signal: 'BUY', confidence: Math.min(mlPrediction.prediction * 50, 1) };
      } else if (mlPrediction.upper < -threshold) {
        mlSignal = { signal: 'SELL', confidence: Math.min(Math.abs(mlPrediction.prediction) * 50, 1) };
      }
    }

    // Combine signals
    const signals = [
      { ...momentum, weight: 0.25 },
      { ...meanRev, weight: 0.25 },
      { ...mlSignal, weight: 0.50 }
    ];

    let buyScore = 0, sellScore = 0;

    for (const s of signals) {
      if (s.signal === 'BUY') {
        buyScore += s.confidence * s.weight;
      } else if (s.signal === 'SELL') {
        sellScore += s.confidence * s.weight;
      }
    }

    if (buyScore > 0.4 && buyScore > sellScore) {
      return { signal: 'BUY', confidence: buyScore, side: 'LONG' };
    }
    if (sellScore > 0.4 && sellScore > buyScore) {
      return { signal: 'SELL', confidence: sellScore, side: 'SHORT' };
    }

    return { signal: 'HOLD', confidence: 0 };
  }

  /**
   * Execute a trade signal
   */
  async executeSignal(signal, currentPrice) {
    if (!signal || signal.signal === 'HOLD') {
      return null;
    }

    // Check if we already have a position
    if (this.positionManager.hasPosition()) {
      console.log(`   Already have ${this.positionManager.getPositionSide()} position, skipping`);
      return null;
    }

    // Get current equity
    const currentEquity = this.pnlTracker.getCurrentEquity();

    // Validate with risk manager
    const currentPosition = this.positionManager.getCurrentPosition();
    const validation = this.riskManager.validateTrade(
      { side: signal.side, strength: signal.confidence },
      currentPosition,
      currentEquity,
      currentPrice
    );

    if (!validation.allowed) {
      console.log(`   ⚠️  Trade rejected: ${validation.reason}`);
      return null;
    }

    // Calculate position size
    const positionSize = validation.adjustedSize;

    console.log(`\n📤 Executing ${signal.signal} order...`);
    console.log(`   Size: ${positionSize.toFixed(6)} ${this.symbol.replace('USDT', '')}`);
    console.log(`   Price: $${currentPrice.toFixed(2)}`);
    console.log(`   Value: $${(positionSize * currentPrice).toFixed(2)}`);

    try {
      // Place market order on Binance Testnet
      const orderSide = signal.signal === 'BUY' ? 'BUY' : 'SELL';
      const order = await this.exchange.placeMarketOrder(this.symbol, orderSide, positionSize);

      console.log(`   ✓ Order filled: ${order.orderId}`);
      console.log(`   Fill price: $${parseFloat(order.avgPrice || currentPrice).toFixed(2)}`);

      // Update position manager
      const fillPrice = parseFloat(order.avgPrice || currentPrice);
      this.positionManager.openPosition(
        this.symbol,
        signal.side,
        fillPrice,
        positionSize,
        Date.now()
      );

      return order;
    } catch (error) {
      console.error(`   ❌ Order failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Check and execute risk management (stop loss, take profit)
   */
  async checkRiskManagement(currentPrice) {
    if (!this.positionManager.hasPosition()) {
      return null;
    }

    const position = this.positionManager.getCurrentPosition();
    const shouldStopLoss = this.riskManager.checkStopLoss(position, currentPrice);
    const shouldTakeProfit = this.riskManager.checkTakeProfit(position, currentPrice);

    if (shouldStopLoss) {
      console.log('\n🛑 Stop Loss triggered!');
      return await this.closePosition(currentPrice, 'STOP_LOSS');
    }

    if (shouldTakeProfit) {
      console.log('\n✅ Take Profit triggered!');
      return await this.closePosition(currentPrice, 'TAKE_PROFIT');
    }

    return null;
  }

  /**
   * Close current position
   */
  async closePosition(currentPrice, reason = 'MANUAL') {
    if (!this.positionManager.hasPosition()) {
      console.log('No position to close');
      return null;
    }

    const position = this.positionManager.getCurrentPosition();
    console.log(`\n📤 Closing ${position.side} position (${reason})...`);

    try {
      // Place closing order (opposite side)
      const closeSide = position.side === 'LONG' ? 'SELL' : 'BUY';
      const order = await this.exchange.placeMarketOrder(
        this.symbol,
        closeSide,
        position.quantity
      );

      console.log(`   ✓ Order filled: ${order.orderId}`);

      const exitPrice = parseFloat(order.avgPrice || currentPrice);

      // Close position in position manager
      const tradeResult = this.positionManager.closePosition(exitPrice, Date.now());

      // Record in P&L tracker
      const pnlResult = this.pnlTracker.recordTrade(tradeResult);

      // Update consecutive losses counter
      if (tradeResult.netPnL < 0) {
        this.consecutiveLosses++;
      } else {
        this.consecutiveLosses = 0;
      }

      // Update peak equity
      if (pnlResult.currentEquity > this.peakEquity) {
        this.peakEquity = pnlResult.currentEquity;
      }

      // Log result
      const pnlSign = tradeResult.netPnL >= 0 ? '+' : '';
      const pnlEmoji = tradeResult.netPnL >= 0 ? '🟢' : '🔴';
      console.log(`   ${pnlEmoji} P&L: ${pnlSign}$${tradeResult.netPnL.toFixed(2)} (${pnlSign}${tradeResult.returnPct.toFixed(2)}%)`);
      console.log(`   Equity: $${pnlResult.currentEquity.toFixed(2)}`);

      return tradeResult;
    } catch (error) {
      console.error(`   ❌ Failed to close position: ${error.message}`);
      return null;
    }
  }

  /**
   * Run single iteration (for testing)
   */
  async runOnce() {
    console.log('\n' + '='.repeat(60));
    console.log(`🤖 Trading Bot - Single Iteration`);
    console.log('='.repeat(60));

    try {
      // Initialize P&L tracker if not done
      if (!this.pnlTracker) {
        const balance = await this.exchange.getAccountBalance();
        const usdtBalance = balance.find(b => b.asset === 'USDT');
        const initialCapital = parseFloat(usdtBalance?.availableBalance || 10000);
        this.pnlTracker = new PnLTracker(initialCapital);
        this.peakEquity = initialCapital;
        console.log(`\n💰 Initial Balance: $${initialCapital.toFixed(2)}`);
      }

      // Fetch latest candles
      console.log(`\n📊 Fetching latest ${this.symbol} data...`);
      const candles = await this.fetchLatestCandles(1000);
      console.log(`   ✓ Fetched ${candles.length} candles`);

      // Train model if not trained
      if (!this.isModelTrained) {
        await this.trainModel(candles);
      }

      // Get current price
      const currentPrice = candles[candles.length - 1].close;
      console.log(`\n💲 Current Price: $${currentPrice.toFixed(2)}`);

      // Calculate indicators
      const indicators = this.calculateIndicators(candles);

      // Get ML prediction
      const mlPrediction = await this.getMLPrediction(candles);

      // Generate signal
      const signal = this.generateSignal(indicators, mlPrediction);

      console.log(`\n🚦 Signal: ${signal.signal} (Confidence: ${(signal.confidence * 100).toFixed(0)}%)`);
      if (mlPrediction) {
        console.log(`   ML Prediction: ${(mlPrediction.prediction * 100).toFixed(4)}%`);
      }

      // Check risk management first
      await this.checkRiskManagement(currentPrice);

      // Execute signal if no position
      if (!this.positionManager.hasPosition()) {
        await this.executeSignal(signal, currentPrice);
      }

      // Log current status
      this.logStatus();

    } catch (error) {
      console.error('\n❌ Error:', error.message);
      throw error;
    }
  }

  /**
   * Main trading loop
   */
  async start() {
    console.log('\n' + '='.repeat(60));
    console.log(`🤖 Trading Bot - LIVE MODE`);
    console.log('='.repeat(60));
    console.log(`Symbol: ${this.symbol}`);
    console.log(`Interval: ${this.interval} (checking every 60 seconds)`);
    console.log(`Press Ctrl+C to stop`);

    this.isRunning = true;

    // Initialize P&L tracker
    try {
      const balance = await this.exchange.getAccountBalance();
      const usdtBalance = balance.find(b => b.asset === 'USDT');
      const initialCapital = parseFloat(usdtBalance?.availableBalance || 10000);
      this.pnlTracker = new PnLTracker(initialCapital);
      this.peakEquity = initialCapital;
      console.log(`\n💰 Initial Balance: $${initialCapital.toFixed(2)}`);
    } catch (error) {
      console.error('Failed to get account balance:', error.message);
      return;
    }

    // Fetch initial data and train model
    try {
      console.log(`\n📊 Fetching initial data...`);
      const candles = await this.fetchLatestCandles(1000);
      console.log(`   ✓ Fetched ${candles.length} candles`);
      await this.trainModel(candles);
    } catch (error) {
      console.error('Failed to initialize:', error.message);
      return;
    }

    // Main loop
    while (this.isRunning) {
      try {
        console.log('\n' + '-'.repeat(60));
        console.log(`⏰ ${new Date().toLocaleString()}`);

        // Fetch latest data
        const candles = await this.fetchLatestCandles(1000);
        const currentPrice = candles[candles.length - 1].close;

        // Calculate indicators
        const indicators = this.calculateIndicators(candles);

        // Get ML prediction
        const mlPrediction = await this.getMLPrediction(candles);

        // Generate signal
        const signal = this.generateSignal(indicators, mlPrediction);

        console.log(`💲 Price: $${currentPrice.toFixed(2)}`);
        console.log(`🚦 Signal: ${signal.signal} (${(signal.confidence * 100).toFixed(0)}%)`);

        // Check risk management
        await this.checkRiskManagement(currentPrice);

        // Execute signal if no position
        if (!this.positionManager.hasPosition()) {
          await this.executeSignal(signal, currentPrice);
        } else {
          // Show current position P&L
          const pnl = this.positionManager.getUnrealizedPnL(currentPrice);
          if (pnl) {
            const pnlSign = pnl.netPnL >= 0 ? '+' : '';
            const pnlEmoji = pnl.netPnL >= 0 ? '🟢' : '🔴';
            console.log(`   ${pnlEmoji} Unrealized P&L: ${pnlSign}$${pnl.netPnL.toFixed(2)} (${pnlSign}${pnl.returnPct.toFixed(2)}%)`);
          }
        }

        // Wait 60 seconds before next iteration
        console.log('⏳ Waiting 60 seconds...');
        await new Promise(resolve => setTimeout(resolve, 60000));

      } catch (error) {
        console.error('❌ Loop error:', error.message);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  /**
   * Stop the bot
   */
  async stop() {
    console.log('\n🛑 Stopping trading bot...');
    this.isRunning = false;

    // Close any open positions
    if (this.positionManager.hasPosition()) {
      console.log('Closing open position...');
      const currentPrice = (await this.exchange.getCurrentPrice(this.symbol)).price;
      await this.closePosition(parseFloat(currentPrice), 'SHUTDOWN');
    }

    console.log('✓ Bot stopped');
  }

  /**
   * Log current status
   */
  logStatus() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRADING BOT STATUS');
    console.log('='.repeat(60));

    if (!this.pnlTracker) {
      console.log('Bot not initialized');
      return;
    }

    // Account metrics
    const metrics = this.pnlTracker.getMetrics();
    console.log('\n💰 Account:');
    console.log(`   Initial Capital: $${metrics.initialCapital.toFixed(2)}`);
    console.log(`   Current Equity: $${metrics.currentEquity.toFixed(2)}`);
    console.log(`   Return: ${metrics.returnPct >= 0 ? '+' : ''}${metrics.returnPct.toFixed(2)}%`);

    // Position
    console.log('\n📈 Position:');
    const position = this.positionManager.getCurrentPosition();
    if (position) {
      console.log(`   Side: ${position.side}`);
      console.log(`   Size: ${position.quantity.toFixed(6)} ${this.symbol.replace('USDT', '')}`);
      console.log(`   Entry: $${position.entryPrice.toFixed(2)}`);
    } else {
      console.log('   No open position');
    }

    // Trading metrics
    console.log('\n📊 Performance:');
    console.log(`   Total Trades: ${metrics.totalTrades}`);
    console.log(`   Win Rate: ${metrics.winRate.toFixed(1)}%`);
    console.log(`   Total P&L: ${metrics.totalPnL >= 0 ? '+' : ''}$${metrics.totalPnL.toFixed(2)}`);
    console.log(`   Commissions: $${metrics.totalCommissions.toFixed(2)}`);

    if (metrics.totalTrades > 0) {
      console.log(`   Avg Win: $${metrics.averageWin.toFixed(2)}`);
      console.log(`   Avg Loss: $${metrics.averageLoss.toFixed(2)}`);
      console.log(`   Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
    }

    console.log('='.repeat(60));
  }
}

// CLI Entry Point
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0];

  const bot = new TradingBot(config);

  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    console.log('\n\nReceived SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('unhandledRejection', (error) => {
    console.error('\n❌ Unhandled error:', error);
    process.exit(1);
  });

  // Execute based on mode
  (async () => {
    try {
      if (mode === '--live') {
        await bot.start();
      } else if (mode === '--once') {
        await bot.runOnce();
      } else if (mode === '--status') {
        // Initialize to load state
        const balance = await bot.exchange.getAccountBalance();
        const usdtBalance = balance.find(b => b.asset === 'USDT');
        const initialCapital = parseFloat(usdtBalance?.availableBalance || 10000);
        bot.pnlTracker = new PnLTracker(initialCapital);
        bot.logStatus();
      } else {
        console.log('Usage:');
        console.log('  node src/trading-bot.js --live      # Run continuous trading loop');
        console.log('  node src/trading-bot.js --once      # Run single iteration');
        console.log('  node src/trading-bot.js --status    # Show current status');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = TradingBot;
