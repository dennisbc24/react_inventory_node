function finite(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function wape(actual, predicted) {
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < actual.length; index += 1) {
    const a = finite(actual[index]);
    const p = finite(predicted[index]);
    numerator += Math.abs(a - p);
    denominator += Math.abs(a);
  }
  return denominator > 0 ? numerator / denominator : 0;
}

function mape(actual, predicted) {
  if (!actual.length) return 0;
  let total = 0;
  for (let index = 0; index < actual.length; index += 1) {
    const a = finite(actual[index]);
    const p = finite(predicted[index]);
    total += Math.abs(a - p) / Math.max(Math.abs(a), 1);
  }
  return total / actual.length;
}

function mae(actual, predicted) {
  if (!actual.length) return 0;
  let total = 0;
  for (let index = 0; index < actual.length; index += 1) {
    total += Math.abs(finite(actual[index]) - finite(predicted[index]));
  }
  return total / actual.length;
}

function rmse(actual, predicted) {
  if (!actual.length) return 0;
  let total = 0;
  for (let index = 0; index < actual.length; index += 1) {
    const error = finite(actual[index]) - finite(predicted[index]);
    total += error * error;
  }
  return Math.sqrt(total / actual.length);
}

function pinball(actual, predicted, quantile) {
  if (!actual.length) return 0;
  const q = Math.max(0.01, Math.min(0.99, Number(quantile) || 0.5));
  let total = 0;
  for (let index = 0; index < actual.length; index += 1) {
    const a = finite(actual[index]);
    const p = finite(predicted[index]);
    total += a >= p ? q * (a - p) : (1 - q) * (p - a);
  }
  return total / actual.length;
}

function summarize(actual, predictions) {
  return {
    wape: wape(actual, predictions.p50),
    mape: mape(actual, predictions.p50),
    mae: mae(actual, predictions.p50),
    rmse: rmse(actual, predictions.p50),
    pinball_p50: pinball(actual, predictions.p50, 0.5),
    pinball_p80: pinball(actual, predictions.p80, 0.8),
  };
}

module.exports = { mae, mape, pinball, rmse, summarize, wape };
