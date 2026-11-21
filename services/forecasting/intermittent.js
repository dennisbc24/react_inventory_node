function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classifyIntermittent(values, options = {}) {
  const windowDays = Number(options.windowDays) || 90;
  const recent = values.slice(-windowDays);
  const nonzero = recent.filter((value) => Number(value) > 0);
  const nonzeroRatio = recent.length ? nonzero.length / recent.length : 0;
  const average = mean(recent);
  const averageNonzero = mean(nonzero);
  return {
    isIntermittent: nonzeroRatio < (options.nonzeroThreshold ?? 0.35) || average < (options.meanThreshold ?? 0.5),
    nonzero_ratio: nonzeroRatio,
    mean: average,
    mean_nonzero: averageNonzero,
    nonzero_days: nonzero.length,
    window_days: recent.length,
  };
}

function tsbForecast(values, horizon, options = {}) {
  const alpha = Number(options.alpha) || 0.1;
  const beta = Number(options.beta) || 0.1;
  const history = values.map((value) => Math.max(0, Number(value) || 0));
  if (!history.length) {
    return { p50: new Array(horizon).fill(0), p80: new Array(horizon).fill(0), probability: 0, size: 0 };
  }
  const nonzero = history.filter((value) => value > 0);
  let probability = nonzero.length / history.length;
  let size = nonzero.length ? mean(nonzero) : 0;

  for (const value of history) {
    const occurrence = value > 0 ? 1 : 0;
    probability += beta * (occurrence - probability);
    if (value > 0) size += alpha * (value - size);
  }

  probability = Math.max(0, Math.min(1, probability));
  size = Math.max(0, size);
  const p50 = new Array(horizon).fill(probability * size);
  const p80 = new Array(horizon).fill(probability * (size + 0.84 * Math.sqrt(Math.max(size, 0))));
  return { p50, p80, probability, size };
}

function crostonForecast(values, horizon, options = {}) {
  const alpha = Number(options.alpha) || 0.1;
  const history = values.map((value) => Math.max(0, Number(value) || 0));
  if (!history.length) {
    return { p50: new Array(horizon).fill(0), p80: new Array(horizon).fill(0), probability: 0, size: 0 };
  }
  let size = 0;
  let interval = 1;
  let lastOccurrence = -1;
  let initialized = false;
  for (let index = 0; index < history.length; index += 1) {
    const value = history[index];
    if (value <= 0) continue;
    if (!initialized) {
      size = value;
      interval = index + 1;
      initialized = true;
    } else {
      size += alpha * (value - size);
      const gap = index - lastOccurrence;
      interval += alpha * (gap - interval);
    }
    lastOccurrence = index;
  }
  const probability = interval > 0 ? 1 / interval : 0;
  const p50 = new Array(horizon).fill(initialized ? size / Math.max(interval, 1) : 0);
  const p80 = new Array(horizon).fill(initialized ? (size + 0.84 * Math.sqrt(Math.max(size, 0))) / Math.max(interval, 1) : 0);
  return { p50, p80, probability, size };
}

module.exports = { classifyIntermittent, crostonForecast, tsbForecast };
