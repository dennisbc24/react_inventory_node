const { addDays, calendarFeatures } = require("./calendar");
const { FEATURE_NAMES, featureRow, historyStats, lastKnownPrice, mean, standardDeviation } = require("./features");
const { GradientBoostedRegressor } = require("./gbm");
const { classifyIntermittent, tsbForecast } = require("./intermittent");
const { summarize } = require("./metrics");

const DEFAULT_OPTIONS = {
  horizon: 28,
  testDays: 28,
  warmupDays: 28,
  maxTrainingRows: 60000,
  stockoutUpliftCap: 0.5,
  model: {
    nEstimators: 40,
    learningRate: 0.08,
    maxDepth: 3,
    minSamplesLeaf: 8,
    maxBins: 24,
    subsample: 0.8,
    lambda: 1,
  },
};

function priorMean(series, index, windowSize) {
  const start = Math.max(0, index - windowSize);
  const values = series.y.slice(start, index);
  return mean(values);
}

function seasonalNaive(series, index) {
  if (index - 7 >= 0) return series.y[index - 7];
  return priorMean(series, index, 7);
}

function movingAverage(series, index) {
  return priorMean(series, index, 7);
}

function baselineResidualStats(series, cutoffIndex, warmupDays) {
  const seasonalResiduals = [];
  const movingResiduals = [];
  for (let index = warmupDays; index <= cutoffIndex; index += 1) {
    seasonalResiduals.push(series.y[index] - seasonalNaive(series, index));
    movingResiduals.push(series.y[index] - movingAverage(series, index));
  }
  return {
    seasonalStd: standardDeviation(seasonalResiduals),
    movingStd: standardDeviation(movingResiduals),
  };
}

function buildTrainingRows(seriesList, cutoffIndexes, warmupDays, options) {
  const maxRows = Number(options.maxTrainingRows) || 0;
  let total = 0;
  for (let seriesIndex = 0; seriesIndex < seriesList.length; seriesIndex += 1) {
    const series = seriesList[seriesIndex];
    const cutoffIndex = cutoffIndexes[seriesIndex];
    for (let index = Math.min(warmupDays, cutoffIndex); index <= cutoffIndex; index += 1) {
      if (series.stockout[index] && series.y[index] === 0) continue;
      total += 1;
    }
  }
  const sample = maxRows > 0 && total > maxRows;
  const step = sample ? total / maxRows : 0;
  const targets = sample
    ? new Set(Array.from({ length: maxRows }, (_, position) => Math.floor(position * step)))
    : null;
  const rows = [];
  let globalIndex = 0;
  for (let seriesIndex = 0; seriesIndex < seriesList.length; seriesIndex += 1) {
    const series = seriesList[seriesIndex];
    const cutoffIndex = cutoffIndexes[seriesIndex];
    for (let index = Math.min(warmupDays, cutoffIndex); index <= cutoffIndex; index += 1) {
      if (series.stockout[index] && series.y[index] === 0) continue;
      if (!sample || targets.has(globalIndex)) {
        rows.push({
          x: featureRow(series, index, options),
          y: series.y[index],
          seriesIndex,
          index,
          date: series.dates[index],
        });
      }
      globalIndex += 1;
    }
  }
  return rows;
}

function buildTestRows(seriesList, cutoffIndexes, options) {
  const rows = [];
  seriesList.forEach((series, seriesIndex) => {
    const cutoffIndex = cutoffIndexes[seriesIndex];
    for (let index = cutoffIndex + 1; index < series.y.length; index += 1) {
      rows.push({
        x: featureRow(series, index, options),
        y: series.y[index],
        seriesIndex,
        index,
        date: series.dates[index],
      });
    }
  });
  return rows;
}

function makeModel(options, quantile, seed) {
  return new GradientBoostedRegressor({
    ...DEFAULT_OPTIONS.model,
    ...(options.model || {}),
    objective: "quantile",
    quantile,
    seed,
  });
}

function p80FromBaseline(p50, std) {
  return Math.max(p50, p50 + 1.28 * Math.max(std, 0));
}

function evaluateHybrid(seriesList, testRows, cutoffIndexes, predictions, intermittentTrain, baselineStats) {
  const actual = [];
  const hybridP50 = [];
  const hybridP80 = [];
  const gbmP50 = [];
  const gbmP80 = [];
  const seasonalP50 = [];
  const seasonalP80 = [];
  const movingP50 = [];
  const movingP80 = [];
  const perSeries = new Map();
  const tsbBySeries = new Map();

  for (const row of testRows) {
    const series = seriesList[row.seriesIndex];
    const cutoffIndex = cutoffIndexes[row.seriesIndex];
    const step = row.index - cutoffIndex - 1;
    const stats = baselineStats[row.seriesIndex];
    const seasonal = seasonalNaive(series, row.index);
    const moving = movingAverage(series, row.index);
    const prediction = predictions.get(`${row.seriesIndex}:${row.index}`) || { p50: moving, p80: p80FromBaseline(moving, stats.movingStd) };
    const useTsb = intermittentTrain[row.seriesIndex];
    if (useTsb && !tsbBySeries.has(row.seriesIndex)) {
      tsbBySeries.set(
        row.seriesIndex,
        tsbForecast(series.y.slice(0, cutoffIndex + 1), Math.max(1, series.y.length - cutoffIndex - 1))
      );
    }
    const tsb = useTsb ? tsbBySeries.get(row.seriesIndex) : null;
    const hybrid = useTsb
      ? { p50: tsb.p50[Math.min(step, tsb.p50.length - 1)] || 0, p80: tsb.p80[Math.min(step, tsb.p80.length - 1)] || 0 }
      : prediction;

    actual.push(row.y);
    gbmP50.push(prediction.p50);
    gbmP80.push(prediction.p80);
    seasonalP50.push(seasonal);
    seasonalP80.push(p80FromBaseline(seasonal, stats.seasonalStd));
    movingP50.push(moving);
    movingP80.push(p80FromBaseline(moving, stats.movingStd));
    hybridP50.push(hybrid.p50);
    hybridP80.push(hybrid.p80);

    if (!perSeries.has(row.seriesIndex)) perSeries.set(row.seriesIndex, { actual: [], p50: [], p80: [] });
    const entry = perSeries.get(row.seriesIndex);
    entry.actual.push(row.y);
    entry.p50.push(hybrid.p50);
    entry.p80.push(hybrid.p80);
  }

  const perSeriesMetrics = new Map();
  for (const [seriesIndex, values] of perSeries.entries()) {
    if (values.actual.length >= 3) {
      perSeriesMetrics.set(seriesIndex, summarize(values.actual, { p50: values.p50, p80: values.p80 }));
    }
  }

  return {
    hybrid: summarize(actual, { p50: hybridP50, p80: hybridP80 }),
    gbm: summarize(actual, { p50: gbmP50, p80: gbmP80 }),
    seasonal_naive: summarize(actual, { p50: seasonalP50, p80: seasonalP80 }),
    moving_average: summarize(actual, { p50: movingP50, p80: movingP80 }),
    perSeries: perSeriesMetrics,
  };
}

function buildFutureSeries(series, horizon, options, p50Model, p80Model, isIntermittent) {
  const future = [];
  const uplift = 1 + Math.min(options.stockoutUpliftCap, series.stats.stockout_rate * options.stockoutUpliftCap);
  const lastDate = series.dates[series.dates.length - 1];
  const lastActualMean = mean(series.y.slice(-7));
  const lastActualStd = standardDeviation(series.y.slice(-28));
  const baselineP50 = lastActualMean;
  const baselineP80 = p80FromBaseline(baselineP50, lastActualStd);

  if (isIntermittent || !p50Model) {
    const tsb = tsbForecast(series.y, horizon);
    let projectedStock = series.has_stock ? Math.max(0, series.current_stock) : 0;
    for (let step = 0; step < horizon; step += 1) {
      const date = addDays(lastDate, step + 1);
      const p50 = Math.max(0, (tsb.p50[step] || 0) * uplift);
      const p80 = Math.max(p50, (tsb.p80[step] || 0) * uplift);
      projectedStock = series.has_stock ? Math.max(0, projectedStock - p50) : 0;
      future.push({
        date,
        p50,
        p80,
        baseline_p50: baselineP50,
        baseline_p80: baselineP80,
        calendar: calendarFeatures(date, options.calendar || {}),
        projected_stock: series.has_stock ? projectedStock : null,
        projected_stockout: series.has_stock && projectedStock <= 0 ? 1 : 0,
      });
    }
    return {
      model: "tsb",
      stockout_uplift: uplift,
      future,
    };
  }

  const extended = {
    ...series,
    dates: [...series.dates],
    y: [...series.y],
    price: [...series.price],
    inbound: [...series.inbound],
    stock_start: [...series.stock_start],
    stock_end: [...series.stock_end],
    stockout: [...series.stockout],
  };
  let projectedStock = series.has_stock ? Math.max(0, series.current_stock) : 0;

  for (let step = 0; step < horizon; step += 1) {
    const index = extended.dates.length;
    const date = addDays(lastDate, step + 1);
    const previousPrice = lastKnownPrice(extended, index - 1);
    extended.dates.push(date);
    extended.y.push(0);
    extended.price.push(previousPrice);
    extended.inbound.push(0);
    extended.stock_start.push(series.has_stock ? projectedStock : 0);
    extended.stock_end.push(series.has_stock ? projectedStock : 0);
    extended.stockout.push(series.has_stock && projectedStock <= 0 ? 1 : 0);

    const row = featureRow(extended, index, options);
    let p50 = Math.max(0, p50Model.predictRow(row));
    let p80 = Math.max(0, p80Model.predictRow(row));
    p50 *= uplift;
    p80 *= uplift;
    p80 = Math.max(p50, p80);
    projectedStock = series.has_stock ? Math.max(0, projectedStock - p50) : 0;
    extended.y[index] = p50;
    extended.stock_end[index] = series.has_stock ? projectedStock : 0;
    extended.stockout[index] = series.has_stock && projectedStock <= 0 ? 1 : 0;

    future.push({
      date,
      p50,
      p80,
      baseline_p50: baselineP50,
      baseline_p80: baselineP80,
      calendar: calendarFeatures(date, options.calendar || {}),
      projected_stock: series.has_stock ? projectedStock : null,
      projected_stockout: series.has_stock && projectedStock <= 0 ? 1 : 0,
    });
  }

  return {
    model: "gbm-quantile",
    stockout_uplift: uplift,
    future,
  };
}

function trainAndForecast(seriesList, options = {}) {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
    model: { ...DEFAULT_OPTIONS.model, ...(options.model || {}) },
  };
  const horizon = Math.max(1, Math.min(120, Number(config.horizon) || DEFAULT_OPTIONS.horizon));
  if (!seriesList.length) {
    return {
      forecasts: [],
      metrics: {},
      meta: {
        horizon,
        train_rows: 0,
        test_rows: 0,
        cutoff_date: null,
        model_config: config.model,
        feature_names: FEATURE_NAMES,
        assumptions: [],
      },
    };
  }

  const historyDays = seriesList[0].dates.length;
  const asOfDate = seriesList[0].dates[historyDays - 1];
  const testDays = Math.max(1, Math.min(config.testDays, Math.max(1, Math.floor(historyDays * 0.25))));
  const cutoffDate = addDays(asOfDate, -testDays);
  const cutoffIndexes = seriesList.map((series) => {
    let cutoff = -1;
    for (let index = 0; index < series.dates.length; index += 1) {
      if (series.dates[index] <= cutoffDate) cutoff = index;
    }
    return cutoff;
  });
  const warmupDays = Math.max(7, Math.min(config.warmupDays, Math.max(7, Math.floor(historyDays * 0.5))));
  const trainRows = buildTrainingRows(seriesList, cutoffIndexes, warmupDays, config);
  const testRows = buildTestRows(seriesList, cutoffIndexes, config);
  const intermittentTrain = seriesList.map((series, index) => {
    const cutoff = cutoffIndexes[index];
    const values = cutoff >= 0 ? series.y.slice(0, cutoff + 1) : series.y;
    return classifyIntermittent(values).isIntermittent;
  });
  const intermittentFull = seriesList.map((series) => classifyIntermittent(series.y).isIntermittent);
  const baselineStats = seriesList.map((series, index) => baselineResidualStats(series, cutoffIndexes[index], warmupDays));

  let p50Model = null;
  let p80Model = null;
  if (trainRows.length >= 20 && trainRows.some((row) => row.y > 0)) {
    const X = trainRows.map((row) => row.x);
    const y = trainRows.map((row) => row.y);
    p50Model = makeModel(config, 0.5, 42).fit(X, y);
    p80Model = makeModel(config, 0.8, 43).fit(X, y);
  }

  const predictions = new Map();
  if (p50Model) {
    for (const row of testRows) {
      predictions.set(`${row.seriesIndex}:${row.index}`, {
        p50: Math.max(0, p50Model.predictRow(row.x)),
        p80: Math.max(0, p80Model.predictRow(row.x)),
      });
    }
  }
  const evaluation = evaluateHybrid(
    seriesList,
    testRows,
    cutoffIndexes,
    predictions,
    intermittentTrain,
    baselineStats
  );

  const forecasts = seriesList.map((series, seriesIndex) => {
    const result = buildFutureSeries(
      series,
      horizon,
      config,
      p50Model,
      p80Model,
      intermittentFull[seriesIndex]
    );
    return {
      sku_id: series.sku_id,
      branch_id: series.branch_id,
      name: series.name,
      category_id: series.category_id,
      supplier_id: series.supplier_id,
      supplier_name: series.supplier_name,
      cost: series.cost,
      list_price: series.list_price,
      lowest_price: series.lowest_price,
      lead_time_min_days: series.lead_time_min_days,
      lead_time_max_days: series.lead_time_max_days,
      current_stock: series.current_stock,
      has_stock: series.has_stock,
      history_stats: historyStats(series),
      recent_stats: series.recent_stats,
      seasonality: series.seasonality,
      yoy_growth: series.yoy_growth,
      is_intermittent: intermittentFull[seriesIndex],
      model: result.model,
      stockout_uplift: result.stockout_uplift,
      future: result.future,
      test_metrics: evaluation.perSeries.get(seriesIndex) || null,
    };
  });

  const featureImportance = p50Model
    ? p50Model.topFeatures(10).map((entry) => ({
        feature: FEATURE_NAMES[entry.index],
        importance: Number(entry.importance.toFixed(6)),
      }))
    : [];

  return {
    forecasts,
    metrics: {
      hybrid: evaluation.hybrid,
      gbm: p50Model ? evaluation.gbm : null,
      seasonal_naive: evaluation.seasonal_naive,
      moving_average: evaluation.moving_average,
    },
    meta: {
      as_of_date: asOfDate,
      cutoff_date: cutoffDate,
      history_days: historyDays,
      horizon,
      warmup_days: warmupDays,
      test_days: testDays,
      train_rows: trainRows.length,
      test_rows: testRows.length,
      model_config: config.model,
      feature_names: FEATURE_NAMES,
      feature_importance: featureImportance,
      intermittent_series: forecasts.filter((forecast) => forecast.is_intermittent).length,
      assumptions: [
        "Historical demand is reconstructed backwards from current existence using sales and entries; stockout days are flagged when reconstructed stock reaches zero.",
        "Zero-sales stockout rows are excluded from GBM training to reduce censored-demand bias; future forecasts receive a capped uplift based on the historical stockout rate.",
        "Lead times default to 4-7 days, can be overridden per product or supplier via lead_time_min_days and lead_time_max_days, and can be overridden for the whole calculation with the lead_time_min and lead_time_max request parameters.",
        "Peru national holidays and pay-cycle effects (15th, month-end) are modeled by default; extra holidays can be passed in options.calendar.extraHolidays.",
      ],
    },
  };
}

module.exports = { DEFAULT_OPTIONS, trainAndForecast };
