/**
 * Advanced Regression Module
 *
 * Features:
 * - Ridge Regression (L2 regularization)
 * - Lasso Regression (L1 regularization)
 * - Elastic Net (L1 + L2)
 * - Feature normalization
 * - Ensemble methods
 */

// ============================================================================
// DATA PREPROCESSING
// ============================================================================

class DataPreprocessor {
  constructor() {
    this.featureMeans = null;
    this.featureStds = null;
  }

  fit(X) {
    const n = X.length;
    const numFeatures = X[0].length;

    this.featureMeans = new Array(numFeatures).fill(0);
    this.featureStds = new Array(numFeatures).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < numFeatures; j++) {
        this.featureMeans[j] += X[i][j];
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      this.featureMeans[j] /= n;
    }

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < numFeatures; j++) {
        const diff = X[i][j] - this.featureMeans[j];
        this.featureStds[j] += diff * diff;
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      this.featureStds[j] = Math.sqrt(this.featureStds[j] / n) + 1e-8;
    }

    return this;
  }

  transform(X) {
    return X.map(row =>
      row.map((val, j) => (val - this.featureMeans[j]) / this.featureStds[j])
    );
  }

  fitTransform(X) {
    return this.fit(X).transform(X);
  }
}

// ============================================================================
// GAUSSIAN ELIMINATION
// ============================================================================

function gaussianElimination(A, b) {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);

  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    if (Math.abs(augmented[i][i]) < 1e-10) continue;

    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(augmented[i][i]) < 1e-10) continue;
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }

  return x;
}

// ============================================================================
// RIDGE REGRESSION (L2)
// ============================================================================

function trainRidgeRegression(X, y, lambda = 0.1) {
  const n = X.length;
  const numFeatures = X[0].length;

  // Compute X'X
  const XTX = Array(numFeatures).fill(0).map(() => Array(numFeatures).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < numFeatures; j++) {
      for (let k = 0; k < numFeatures; k++) {
        XTX[j][k] += X[i][j] * X[i][k];
      }
    }
  }

  // Add lambda to diagonal
  for (let j = 0; j < numFeatures; j++) {
    XTX[j][j] += lambda;
  }

  // Compute X'y
  const XTy = Array(numFeatures).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < numFeatures; j++) {
      XTy[j] += X[i][j] * y[i];
    }
  }

  const weights = gaussianElimination(XTX, XTy);

  // Calculate bias
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const xMeans = X[0].map((_, j) => X.reduce((sum, row) => sum + row[j], 0) / n);
  let bias = yMean;
  for (let j = 0; j < numFeatures; j++) {
    bias -= weights[j] * xMeans[j];
  }

  return { weights, bias };
}

// ============================================================================
// LASSO REGRESSION (L1) - Coordinate Descent
// ============================================================================

function trainLassoRegression(X, y, lambda = 0.01, maxIter = 1000, tolerance = 1e-4) {
  const n = X.length;
  const numFeatures = X[0].length;
  let weights = new Array(numFeatures).fill(0);

  // Precompute X'X diagonal
  const XXdiag = new Array(numFeatures);
  for (let j = 0; j < numFeatures; j++) {
    XXdiag[j] = X.reduce((sum, row) => sum + row[j] * row[j], 0);
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let maxUpdate = 0;

    for (let j = 0; j < numFeatures; j++) {
      let rj = 0;
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let k = 0; k < numFeatures; k++) {
          if (k !== j) pred += X[i][k] * weights[k];
        }
        rj += X[i][j] * (y[i] - pred);
      }

      const oldWeight = weights[j];
      const threshold = lambda * n / 2;

      if (rj > threshold) {
        weights[j] = (rj - threshold) / XXdiag[j];
      } else if (rj < -threshold) {
        weights[j] = (rj + threshold) / XXdiag[j];
      } else {
        weights[j] = 0;
      }

      maxUpdate = Math.max(maxUpdate, Math.abs(weights[j] - oldWeight));
    }

    if (maxUpdate < tolerance) break;
  }

  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const xMeans = X[0].map((_, j) => X.reduce((sum, row) => sum + row[j], 0) / n);
  let bias = yMean;
  for (let j = 0; j < numFeatures; j++) {
    bias -= weights[j] * xMeans[j];
  }

  return { weights, bias };
}

// ============================================================================
// ELASTIC NET (L1 + L2)
// ============================================================================

function trainElasticNet(X, y, lambda = 0.1, alpha = 0.5, maxIter = 1000, tolerance = 1e-4) {
  const n = X.length;
  const numFeatures = X[0].length;
  let weights = new Array(numFeatures).fill(0);

  const XXdiag = new Array(numFeatures);
  for (let j = 0; j < numFeatures; j++) {
    XXdiag[j] = X.reduce((sum, row) => sum + row[j] * row[j], 0);
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let maxUpdate = 0;

    for (let j = 0; j < numFeatures; j++) {
      let rj = 0;
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let k = 0; k < numFeatures; k++) {
          if (k !== j) pred += X[i][k] * weights[k];
        }
        rj += X[i][j] * (y[i] - pred);
      }

      const oldWeight = weights[j];
      const l1Threshold = lambda * alpha * n / 2;
      const l2Penalty = lambda * (1 - alpha);

      if (rj > l1Threshold) {
        weights[j] = (rj - l1Threshold) / (XXdiag[j] + l2Penalty * n);
      } else if (rj < -l1Threshold) {
        weights[j] = (rj + l1Threshold) / (XXdiag[j] + l2Penalty * n);
      } else {
        weights[j] = 0;
      }

      maxUpdate = Math.max(maxUpdate, Math.abs(weights[j] - oldWeight));
    }

    if (maxUpdate < tolerance) break;
  }

  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const xMeans = X[0].map((_, j) => X.reduce((sum, row) => sum + row[j], 0) / n);
  let bias = yMean;
  for (let j = 0; j < numFeatures; j++) {
    bias -= weights[j] * xMeans[j];
  }

  return { weights, bias };
}

// ============================================================================
// FEATURE SELECTION
// ============================================================================

function selectFeaturesByCorrelation(X, y, numFeatures) {
  const n = X.length;
  const totalFeatures = X[0].length;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const yStd = Math.sqrt(y.reduce((a, yi) => a + (yi - yMean) ** 2, 0) / n);

  const correlations = new Array(totalFeatures);
  for (let j = 0; j < totalFeatures; j++) {
    const xMean = X.reduce((sum, row) => sum + row[j], 0) / n;
    const xStd = Math.sqrt(X.reduce((sum, row) => sum + (row[j] - xMean) ** 2, 0) / n);

    let covariance = 0;
    for (let i = 0; i < n; i++) {
      covariance += (X[i][j] - xMean) * (y[i] - yMean);
    }
    covariance /= n;

    correlations[j] = Math.abs(covariance / (xStd * yStd + 1e-8));
  }

  return correlations
    .map((corr, idx) => ({ idx, corr }))
    .sort((a, b) => b.corr - a.corr)
    .slice(0, numFeatures)
    .map(x => x.idx)
    .sort((a, b) => a - b);
}

// ============================================================================
// ENSEMBLE METHODS
// ============================================================================

function trainWeightedEnsemble(X, y, methods) {
  const models = [];
  let totalWeight = 0;

  for (const method of methods) {
    const model = method.fn(X, y, method.lambda || 0.1);
    models.push({ model, weight: method.weight });
    totalWeight += method.weight;
  }

  for (const m of models) {
    m.weight /= totalWeight;
  }

  return {
    predict: (features) => {
      let prediction = 0;
      for (const { model, weight } of models) {
        let pred = model.bias;
        for (let j = 0; j < features.length && j < model.weights.length; j++) {
          pred += model.weights[j] * features[j];
        }
        prediction += pred * weight;
      }
      return prediction;
    },
    models
  };
}

function trainBaggingEnsemble(X, y, trainFn, numModels = 5, sampleRatio = 0.8) {
  const models = [];
  const n = X.length;
  const sampleSize = Math.floor(n * sampleRatio);

  for (let m = 0; m < numModels; m++) {
    const indices = new Set();
    for (let i = 0; i < sampleSize; i++) {
      indices.add(Math.floor(Math.random() * n));
    }

    const bootX = Array.from(indices).map(idx => X[idx]);
    const bootY = Array.from(indices).map(idx => y[idx]);

    models.push(trainFn(bootX, bootY));
  }

  return {
    predict: (features) => {
      const predictions = models.map(model => {
        let pred = model.bias;
        for (let j = 0; j < features.length && j < model.weights.length; j++) {
          pred += model.weights[j] * features[j];
        }
        return pred;
      });
      return predictions.reduce((a, b) => a + b, 0) / predictions.length;
    },
    models
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  DataPreprocessor,
  trainRidgeRegression,
  trainLassoRegression,
  trainElasticNet,
  selectFeaturesByCorrelation,
  trainWeightedEnsemble,
  trainBaggingEnsemble
};
