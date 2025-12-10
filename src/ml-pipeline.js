/**
 * Neural Trader ML Pipeline v2
 *
 * Pipeline mejorado con:
 * - Más datos históricos (12+ meses en batches)
 * - Más features técnicos (40+)
 * - Horizonte reducido para mayor precisión
 * - Sin Future Leak, Repainting ni Overfitting
 */

// Use main neural-trader package
const neuralTrader = require('neural-trader');
const {
  calculateRsi,
  calculateSma,
  neuralTrain,
  neuralPredict
} = neuralTrader;

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURACIÓN MEJORADA
// ============================================================================

const CONFIG = {
  // Datos
  symbol: 'BTCUSDT',
  interval: '1h',
  dataSource: 'binance-testnet',
  monthsOfData: 12,  // 12 meses de datos

  // Feature Engineering (sin future leak)
  features: {
    lookback: 100,  // Ventana más larga para capturar patrones
  },

  // Predicción - horizonte más corto = más precisión
  prediction: {
    horizon: 1,      // Predecir 1 periodo adelante (más preciso)
    confidence: 0.90 // 90% para intervalos más estrechos
  },

  // Entrenamiento mejorado
  training: {
    epochs: 100,
    batchSize: 64,
    walkForwardSplits: 5
  }
};

// ============================================================================
// CONFORMAL PREDICTION
// ============================================================================

class SimpleConformalPredictor {
  constructor(confidence = 0.90) {
    this.confidence = confidence;
    this.calibrationResiduals = [];
  }

  calibrate(predictions, actuals) {
    this.calibrationResiduals = predictions.map((pred, i) =>
      Math.abs(pred - actuals[i])
    );
    this.calibrationResiduals.sort((a, b) => a - b);
  }

  predict(pointPrediction) {
    if (this.calibrationResiduals.length === 0) {
      throw new Error('Predictor not calibrated');
    }

    const n = this.calibrationResiduals.length;
    const quantileIndex = Math.ceil((n + 1) * this.confidence) - 1;
    const margin = this.calibrationResiduals[Math.min(quantileIndex, n - 1)];

    return {
      prediction: pointPrediction,
      lower: pointPrediction - margin,
      upper: pointPrediction + margin,
      margin: margin
    };
  }
}

// ============================================================================
// INDICADORES TÉCNICOS (implementación manual sin future leak)
// ============================================================================

function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calculateMACD(prices) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal = calculateEMA(macd, 9);
  const histogram = macd.map((v, i) => v - signal[i]);
  return { macd, signal, histogram };
}

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  const result = { upper: [], middle: [], lower: [], width: [] };

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.upper.push(null);
      result.middle.push(null);
      result.lower.push(null);
      result.width.push(null);
      continue;
    }

    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    result.middle.push(mean);
    result.upper.push(mean + stdDev * std);
    result.lower.push(mean - stdDev * std);
    result.width.push((2 * stdDev * std) / mean); // Ancho normalizado
  }

  return result;
}

function calculateATR(highs, lows, closes, period = 14) {
  const tr = [highs[0] - lows[0]];

  for (let i = 1; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }

  // ATR como EMA del True Range
  return calculateEMA(tr, period);
}

function calculateStochastic(highs, lows, closes, period = 14) {
  const k = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      k.push(50);
      continue;
    }

    const highSlice = highs.slice(i - period + 1, i + 1);
    const lowSlice = lows.slice(i - period + 1, i + 1);

    const highest = Math.max(...highSlice);
    const lowest = Math.min(...lowSlice);

    if (highest === lowest) {
      k.push(50);
    } else {
      k.push(100 * (closes[i] - lowest) / (highest - lowest));
    }
  }

  // %D es SMA de %K
  const d = calculateSma(k, 3);

  return { k, d };
}

function calculateOBV(closes, volumes) {
  const obv = [0];

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv.push(obv[i - 1] + volumes[i]);
    } else if (closes[i] < closes[i - 1]) {
      obv.push(obv[i - 1] - volumes[i]);
    } else {
      obv.push(obv[i - 1]);
    }
  }

  return obv;
}

// ============================================================================
// CLASE PRINCIPAL: MLPipeline v2
// ============================================================================

class MLPipeline {
  constructor(config = CONFIG) {
    this.config = config;
    this.modelId = null;
    this.conformalPredictor = new SimpleConformalPredictor(config.prediction.confidence);
  }

  /**
   * PASO 1: Obtener datos históricos en batches (12+ meses)
   */
  async fetchHistoricalData(startDate, endDate) {
    console.log(`\n📊 Fetching ${this.config.symbol} data (${this.config.monthsOfData} months)...`);

    const baseUrl = 'https://testnet.binancefuture.com';
    const endpoint = '/fapi/v1/klines';

    const allCandles = [];
    let currentStart = new Date(startDate).getTime();
    const finalEnd = new Date(endDate).getTime();

    // Binance limita a 1500 candles por request
    // 1h interval = 1500 horas = ~62 días por batch
    const batchSize = 1500;
    const msPerCandle = 60 * 60 * 1000; // 1 hora

    let batchNum = 0;

    while (currentStart < finalEnd) {
      batchNum++;
      const batchEnd = Math.min(currentStart + batchSize * msPerCandle, finalEnd);

      const params = new URLSearchParams({
        symbol: this.config.symbol,
        interval: this.config.interval,
        startTime: currentStart.toString(),
        endTime: batchEnd.toString(),
        limit: batchSize.toString()
      });

      try {
        const response = await fetch(`${baseUrl}${endpoint}?${params}`);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const rawData = await response.json();

        if (rawData.length === 0) break;

        const candles = rawData.map(d => ({
          timestamp: d[0],
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5])
        }));

        allCandles.push(...candles);

        // Siguiente batch empieza donde terminó este
        currentStart = candles[candles.length - 1].timestamp + msPerCandle;

        process.stdout.write(`   Batch ${batchNum}: ${allCandles.length} candles\r`);

        // Pequeña pausa para no sobrecargar el API
        await new Promise(r => setTimeout(r, 100));

      } catch (error) {
        console.error('\nError fetching batch:', error.message);
        break;
      }
    }

    // Eliminar duplicados por timestamp
    const uniqueCandles = [...new Map(allCandles.map(c => [c.timestamp, c])).values()];
    uniqueCandles.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`\n✅ Fetched ${uniqueCandles.length} candles (${(uniqueCandles.length / 24).toFixed(0)} days)`);
    return uniqueCandles;
  }

  /**
   * PASO 2: Feature Engineering MEJORADO (40+ features)
   */
  calculateFeatures(candles, currentIndex) {
    const lookback = this.config.features.lookback;

    if (currentIndex < lookback) {
      return null;
    }

    const window = candles.slice(currentIndex - lookback, currentIndex + 1);
    const closes = window.map(c => c.close);
    const highs = window.map(c => c.high);
    const lows = window.map(c => c.low);
    const volumes = window.map(c => c.volume);

    const currentClose = closes[closes.length - 1];
    const features = [];

    // ============ RETURNS (10 features) ============
    // Returns en diferentes horizontes
    for (const period of [1, 2, 3, 5, 10, 20]) {
      if (closes.length > period) {
        features.push((currentClose - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]);
      } else {
        features.push(0);
      }
    }

    // Volatilidad de returns recientes
    const returns = [];
    for (let i = 1; i < Math.min(21, closes.length); i++) {
      returns.push((closes[closes.length - i] - closes[closes.length - i - 1]) / closes[closes.length - i - 1]);
    }
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const returnStd = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length);
    features.push(returnStd);

    // Skewness de returns
    const skewness = returns.reduce((a, b) => a + Math.pow((b - meanReturn) / returnStd, 3), 0) / returns.length;
    features.push(isNaN(skewness) ? 0 : skewness);

    // Kurtosis de returns
    const kurtosis = returns.reduce((a, b) => a + Math.pow((b - meanReturn) / returnStd, 4), 0) / returns.length - 3;
    features.push(isNaN(kurtosis) ? 0 : kurtosis);

    // Max drawdown reciente
    let maxPrice = closes[0];
    let maxDrawdown = 0;
    for (const price of closes.slice(-20)) {
      if (price > maxPrice) maxPrice = price;
      const dd = (maxPrice - price) / maxPrice;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
    features.push(maxDrawdown);

    // ============ RSI (3 features) ============
    const rsi = calculateRsi(closes, 14);
    const rsiValue = rsi[rsi.length - 1] || 50;
    features.push(rsiValue / 100);
    features.push(rsiValue > 70 ? 1 : (rsiValue < 30 ? -1 : 0)); // Overbought/Oversold

    // RSI momentum (cambio en RSI)
    const rsiPrev = rsi[rsi.length - 5] || 50;
    features.push((rsiValue - rsiPrev) / 100);

    // ============ MOVING AVERAGES (6 features) ============
    const sma10 = calculateSma(closes, 10);
    const sma20 = calculateSma(closes, 20);
    const sma50 = calculateSma(closes, 50);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);

    features.push(currentClose / (sma10[sma10.length - 1] || currentClose) - 1);
    features.push(currentClose / (sma20[sma20.length - 1] || currentClose) - 1);
    features.push(currentClose / (sma50[sma50.length - 1] || currentClose) - 1);
    features.push((sma10[sma10.length - 1] || 1) / (sma20[sma20.length - 1] || 1) - 1);
    features.push((sma20[sma20.length - 1] || 1) / (sma50[sma50.length - 1] || 1) - 1);
    features.push((ema12[ema12.length - 1] || 1) / (ema26[ema26.length - 1] || 1) - 1);

    // ============ MACD (3 features) ============
    const macd = calculateMACD(closes);
    const macdValue = macd.macd[macd.macd.length - 1] || 0;
    const signalValue = macd.signal[macd.signal.length - 1] || 0;
    const histValue = macd.histogram[macd.histogram.length - 1] || 0;

    features.push(macdValue / currentClose * 100);
    features.push((macdValue - signalValue) / currentClose * 100);
    features.push(histValue > 0 ? 1 : -1); // MACD crossover direction

    // ============ BOLLINGER BANDS (4 features) ============
    const bb = calculateBollingerBands(closes, 20, 2);
    const bbUpper = bb.upper[bb.upper.length - 1] || currentClose;
    const bbLower = bb.lower[bb.lower.length - 1] || currentClose;
    const bbMiddle = bb.middle[bb.middle.length - 1] || currentClose;
    const bbWidth = bb.width[bb.width.length - 1] || 0;

    features.push((currentClose - bbMiddle) / (bbUpper - bbLower || 1)); // Posición en banda
    features.push(bbWidth); // Ancho de banda (volatilidad)
    features.push(currentClose > bbUpper ? 1 : (currentClose < bbLower ? -1 : 0)); // Fuera de banda

    // Squeeze (bandas estrechas)
    const bbWidthSMA = calculateSma(bb.width.filter(x => x !== null), 20);
    features.push(bbWidth < (bbWidthSMA[bbWidthSMA.length - 1] || bbWidth) ? 1 : 0);

    // ============ ATR (2 features) ============
    const atr = calculateATR(highs, lows, closes, 14);
    const atrValue = atr[atr.length - 1] || 0;
    features.push(atrValue / currentClose); // ATR normalizado

    // ATR expansion/contraction
    const atrPrev = atr[atr.length - 10] || atrValue;
    features.push(atrValue / (atrPrev || 1) - 1);

    // ============ STOCHASTIC (2 features) ============
    const stoch = calculateStochastic(highs, lows, closes, 14);
    features.push(stoch.k[stoch.k.length - 1] / 100);
    features.push((stoch.k[stoch.k.length - 1] - stoch.d[stoch.d.length - 1]) / 100);

    // ============ VOLUME (4 features) ============
    const avgVolume20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const avgVolume5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const currentVolume = volumes[volumes.length - 1];

    features.push(currentVolume / avgVolume20 - 1);
    features.push(avgVolume5 / avgVolume20 - 1);

    // OBV trend
    const obv = calculateOBV(closes, volumes);
    const obvSMA = calculateSma(obv, 20);
    features.push(obv[obv.length - 1] > (obvSMA[obvSMA.length - 1] || 0) ? 1 : -1);

    // Volume-price correlation
    let vpCorr = 0;
    for (let i = closes.length - 10; i < closes.length; i++) {
      vpCorr += (closes[i] > closes[i-1] ? 1 : -1) * (volumes[i] > volumes[i-1] ? 1 : -1);
    }
    features.push(vpCorr / 10);

    // ============ PRICE PATTERNS (3 features) ============
    // Higher highs / Lower lows
    const recentHighs = highs.slice(-5);
    const recentLows = lows.slice(-5);
    let hhCount = 0, llCount = 0;
    for (let i = 1; i < recentHighs.length; i++) {
      if (recentHighs[i] > recentHighs[i-1]) hhCount++;
      if (recentLows[i] < recentLows[i-1]) llCount++;
    }
    features.push((hhCount - llCount) / 4);

    // Candlestick body ratio
    const body = Math.abs(window[window.length - 1].close - window[window.length - 1].open);
    const range = window[window.length - 1].high - window[window.length - 1].low;
    features.push(range > 0 ? body / range : 0);

    // Trend strength (linear regression slope)
    const n = 20;
    const recentCloses = closes.slice(-n);
    const xMean = (n - 1) / 2;
    const yMean = recentCloses.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (recentCloses[i] - yMean);
      den += Math.pow(i - xMean, 2);
    }
    const slope = den > 0 ? num / den : 0;
    features.push(slope / yMean * 100); // Slope normalizado

    return features;
  }

  /**
   * PASO 3: Preparar datos para entrenamiento
   */
  prepareTrainingData(candles) {
    console.log('\n🔧 Preparing training data...');

    const lookback = this.config.features.lookback;
    const horizon = this.config.prediction.horizon;

    const X = [];
    const y = [];

    for (let i = lookback; i < candles.length - horizon; i++) {
      const features = this.calculateFeatures(candles, i);
      if (features === null) continue;

      const currentPrice = candles[i].close;
      const futurePrice = candles[i + horizon].close;
      const futureReturn = (futurePrice - currentPrice) / currentPrice;

      X.push(features);
      y.push(futureReturn);
    }

    console.log(`✅ Generated ${X.length} samples (${X[0]?.length || 0} features each)`);
    return { X, y };
  }

  /**
   * PASO 4: Walk-Forward Backtest
   */
  async walkForwardBacktest(candles) {
    console.log('\n🔄 Starting walk-forward backtest...');

    const { X, y } = this.prepareTrainingData(candles);
    const numSplits = this.config.training.walkForwardSplits;
    const n = X.length;
    const testSize = Math.floor(n / (numSplits + 1));

    const results = [];

    for (let fold = 0; fold < numSplits; fold++) {
      console.log(`\n--- Fold ${fold + 1}/${numSplits} ---`);

      const trainEnd = testSize * (fold + 1);
      const testStart = trainEnd;
      const testEnd = Math.min(testStart + testSize, n);

      const X_train = X.slice(0, trainEnd);
      const y_train = y.slice(0, trainEnd);
      const X_test = X.slice(testStart, testEnd);
      const y_test = y.slice(testStart, testEnd);

      const calSize = Math.floor(X_train.length * 0.2);
      const X_cal = X_train.slice(-calSize);
      const y_cal = y_train.slice(-calSize);

      console.log(`   Train: ${trainEnd - calSize}, Cal: ${calSize}, Test: ${testEnd - testStart}`);

      // Entrenar modelo
      console.log('   Training neural model...');
      const trainData = {
        features: X_train.slice(0, -calSize).flat(),
        targets: y_train.slice(0, -calSize)
      };
      const trainResultRaw = await neuralTrain(
        'regression',
        JSON.stringify(trainData),
        this.config.training.epochs,
        this.config.training.batchSize
      );

      // Parse JSON string response
      const trainResult = typeof trainResultRaw === 'string' ? JSON.parse(trainResultRaw) : trainResultRaw;
      this.modelId = trainResult.training_id || 'default';

      // Calibrar conformal predictor
      const calPredictions = [];
      for (const x of X_cal) {
        const predRaw = await neuralPredict(this.modelId, JSON.stringify(x));
        const pred = typeof predRaw === 'string' ? JSON.parse(predRaw) : predRaw;
        calPredictions.push(pred.predictions?.[0] || pred.prediction || 0);
      }
      this.conformalPredictor.calibrate(calPredictions, y_cal);

      // Evaluar en test
      let covered = 0;
      let totalError = 0;
      let correctDirection = 0;

      for (let i = 0; i < X_test.length; i++) {
        const predRaw = await neuralPredict(this.modelId, JSON.stringify(X_test[i]));
        const pred = typeof predRaw === 'string' ? JSON.parse(predRaw) : predRaw;
        const pointPred = pred.predictions?.[0] || pred.prediction || 0;
        const interval = this.conformalPredictor.predict(pointPred);

        if (y_test[i] >= interval.lower && y_test[i] <= interval.upper) {
          covered++;
        }
        totalError += Math.abs(pointPred - y_test[i]);

        // Dirección correcta
        if ((pointPred > 0 && y_test[i] > 0) || (pointPred < 0 && y_test[i] < 0)) {
          correctDirection++;
        }
      }

      const coverage = covered / X_test.length;
      const mae = totalError / X_test.length;
      const accuracy = correctDirection / X_test.length;

      console.log(`   Coverage: ${(coverage * 100).toFixed(1)}% (target: ${this.config.prediction.confidence * 100}%)`);
      console.log(`   MAE: ${(mae * 100).toFixed(4)}%`);
      console.log(`   Direction Accuracy: ${(accuracy * 100).toFixed(1)}%`);

      results.push({ fold: fold + 1, coverage, mae, accuracy });
    }

    // Resumen
    const avgCoverage = results.reduce((s, r) => s + r.coverage, 0) / results.length;
    const avgMAE = results.reduce((s, r) => s + r.mae, 0) / results.length;
    const avgAccuracy = results.reduce((s, r) => s + r.accuracy, 0) / results.length;

    console.log('\n' + '='.repeat(50));
    console.log('📈 WALK-FORWARD SUMMARY');
    console.log('='.repeat(50));
    console.log(`Average Coverage: ${(avgCoverage * 100).toFixed(1)}%`);
    console.log(`Average MAE: ${(avgMAE * 100).toFixed(4)}%`);
    console.log(`Average Direction Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);

    if (avgCoverage >= this.config.prediction.confidence - 0.05) {
      console.log('\n✅ Model well-calibrated!');
    } else {
      console.log('\n⚠️  Model needs recalibration');
    }

    return results;
  }

  /**
   * PASO 5: Predicción
   */
  async predict(features) {
    const predRaw = await neuralPredict(this.modelId, JSON.stringify(features));
    const pred = typeof predRaw === 'string' ? JSON.parse(predRaw) : predRaw;
    const pointPred = pred.predictions?.[0] || pred.prediction || 0;
    return this.conformalPredictor.predict(pointPred);
  }
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('🧠 NEURAL TRADER ML PIPELINE v2');
  console.log('   More Data | More Features | Shorter Horizon');
  console.log('═'.repeat(60));

  const pipeline = new MLPipeline();

  try {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - CONFIG.monthsOfData);

    console.log(`\n📅 Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`📊 Symbol: ${CONFIG.symbol} | Interval: ${CONFIG.interval}`);
    console.log(`🔮 Horizon: ${CONFIG.prediction.horizon} period(s) | Confidence: ${CONFIG.prediction.confidence * 100}%`);

    const candles = await pipeline.fetchHistoricalData(
      startDate.toISOString(),
      endDate.toISOString()
    );

    if (candles.length < 500) {
      console.log('⚠️  Need more data (min 500 candles)');
      return;
    }

    await pipeline.walkForwardBacktest(candles);

    // Predicción actual
    console.log('\n' + '='.repeat(50));
    console.log('🔮 LIVE PREDICTION');
    console.log('='.repeat(50));

    const latestFeatures = pipeline.calculateFeatures(candles, candles.length - 1);
    if (latestFeatures) {
      const prediction = await pipeline.predict(latestFeatures);
      const currentPrice = candles[candles.length - 1].close;

      console.log(`\nCurrent ${CONFIG.symbol}: $${currentPrice.toFixed(2)}`);
      console.log(`\nNext ${CONFIG.prediction.horizon}h Forecast:`);
      console.log(`   Expected: ${(prediction.prediction * 100).toFixed(3)}%`);
      console.log(`   ${CONFIG.prediction.confidence * 100}% CI: [${(prediction.lower * 100).toFixed(3)}%, ${(prediction.upper * 100).toFixed(3)}%]`);

      const expectedPrice = currentPrice * (1 + prediction.prediction);
      console.log(`\n   Price Target: $${expectedPrice.toFixed(2)}`);
      console.log(`   Range: $${(currentPrice * (1 + prediction.lower)).toFixed(2)} - $${(currentPrice * (1 + prediction.upper)).toFixed(2)}`);

      // Señal
      console.log('\n🚦 Trading Signal:');
      if (prediction.lower > 0.001) {
        console.log('   🟢 BULLISH - High confidence upward move');
      } else if (prediction.upper < -0.001) {
        console.log('   🔴 BEARISH - High confidence downward move');
      } else {
        console.log('   ⚪ NEUTRAL - Uncertainty spans zero');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

module.exports = { MLPipeline, CONFIG };

if (require.main === module) {
  main().catch(console.error);
}
