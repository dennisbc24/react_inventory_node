const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { addDays, calendarFeatures, easterSunday } = require("../services/forecasting/calendar");
const { mape, pinball, wape } = require("../services/forecasting/metrics");
const { GradientBoostedRegressor } = require("../services/forecasting/gbm");
const { classifyIntermittent, tsbForecast } = require("../services/forecasting/intermittent");
const { buildSeriesCollection } = require("../services/forecasting/features");
const { trainAndForecast, trainModels } = require("../services/forecasting/demand_forecaster");
const { saveArtifact } = require("../services/forecasting/model_store");
const {
  buildRestockPlan,
  buildRiskBreakdown,
  consolidateForecastsBySku,
  filterDiscontinuedSkus,
  filterStaleSkus,
  resolveProfitReference,
  zScore,
} = require("../services/forecasting/restock_optimizer");
const { ForecastingService, normalizeCommonParams } = require("../services/forecasting/forecasting_service");
const { RestockSnapshotStore, msUntilNextRun } = require("../services/forecasting/restock_snapshot");

// Aísla los tests de cualquier artefacto local: siempre entrenan en caliente.
process.env.FORECASTING_MODEL_PATH = path.join(
  os.tmpdir(),
  `forecasting-test-missing-${process.pid}-${Date.now()}.json`
);

function makeDataset({ days = 420, endDate = "2024-02-04" } = {}) {
  const dates = Array.from({ length: days }, (_, index) => addDays(endDate, -(days - 1 - index)));
  const sales = [];
  const entries = [];
  dates.forEach((date, index) => {
    const calendar = calendarFeatures(date);
    const denseDemand = Math.max(
      0,
      Math.round(
        6 +
          2 * calendar.sin_dow +
          (calendar.dow === 5 ? 3 : 0) +
          (calendar.is_pay_cycle ? 2 : 0) +
          (calendar.is_holiday ? 4 : 0) +
          (index % 21 === 0 ? 2 : 0)
      )
    );
    if (denseDemand > 0) {
      sales.push({
        sku_id: 1,
        branch_id: 1,
        date,
        units: denseDemand,
        revenue: denseDemand * 10,
        profit: denseDemand * 5,
        unit_price: 10,
      });
    }
    if (index % 5 === 0) {
      sales.push({
        sku_id: 2,
        branch_id: 1,
        date,
        units: 1,
        revenue: 10,
        profit: 5,
        unit_price: 10,
      });
    }
    if (index % 30 === 0) {
      entries.push({ sku_id: 1, branch_id: 1, date, units: 180 });
      entries.push({ sku_id: 2, branch_id: 1, date, units: 20 });
    }
  });
  return {
    sales,
    entries,
    stock: [
      { sku_id: 1, branch_id: 1, stock: 30 },
      { sku_id: 2, branch_id: 1, stock: 4 },
    ],
    products: [
      {
        id_product: 1,
        name: "Producto denso",
        cost: 5,
        list_price: 10,
        lowest_price: 8,
        fk_category: 1,
        fk_supplier: 1,
        lead_time_min_days: 4,
        lead_time_max_days: 7,
      },
      {
        id_product: 2,
        name: "Producto intermitente",
        cost: 4,
        list_price: 9,
        lowest_price: 7,
        fk_category: 1,
        fk_supplier: 1,
        lead_time_min_days: 5,
        lead_time_max_days: 7,
      },
    ],
    suppliers: [
      { id_supplier: 1, name: "Proveedor demo", lead_time_min_days: 4, lead_time_max_days: 7 },
    ],
    branches: [{ id_branch: 1, name: "Principal" }],
  };
}

test("calendar features capture holidays, pay cycles and seasonality", () => {
  const holiday = calendarFeatures("2024-07-28");
  assert.equal(holiday.is_holiday, 1);
  assert.equal(holiday.is_peak_season, 1);
  assert.equal(calendarFeatures("2024-07-15").is_pay_cycle, 1);
  assert.equal(calendarFeatures("2024-12-10").is_peak_season, 1);
  assert.equal(easterSunday(2024).toISOString().slice(0, 10), "2024-03-31");
});

test("forecast metrics compute WAPE, MAPE and pinball loss", () => {
  const actual = [10, 20, 0, 5];
  const predicted = [12, 18, 1, 4];
  assert.ok(wape(actual, predicted) > 0);
  assert.ok(mape(actual, predicted) > 0);
  assert.ok(pinball(actual, predicted, 0.8) >= 0);
});

test("gradient boosted trees learn a non-linear series", () => {
  const X = [];
  const y = [];
  for (let index = 0; index < 300; index += 1) {
    const x1 = index / 10;
    const x2 = Math.sin(index / 7);
    X.push([x1, x2]);
    y.push(10 + 2 * x1 + 5 * x2);
  }
  const model = new GradientBoostedRegressor({
    nEstimators: 40,
    maxDepth: 3,
    maxBins: 20,
    learningRate: 0.1,
    objective: "l2",
    seed: 7,
  }).fit(X, y);
  const predictions = model.predict(X);
  assert.ok(wape(y, predictions) < 0.15);
});

test("gradient boosted model round-trips through JSON with identical predictions", () => {
  const X = [];
  const y = [];
  for (let index = 0; index < 200; index += 1) {
    const x1 = index / 7;
    const x2 = Math.cos(index / 5);
    X.push([x1, x2]);
    y.push(Math.max(0, 3 + 1.5 * x1 + 2 * x2));
  }
  const model = new GradientBoostedRegressor({
    nEstimators: 12,
    maxDepth: 3,
    maxBins: 16,
    learningRate: 0.1,
    objective: "quantile",
    quantile: 0.8,
    seed: 3,
  }).fit(X, y);
  const restored = GradientBoostedRegressor.fromJSON(JSON.parse(JSON.stringify(model)));
  assert.deepEqual(restored.predict(X), model.predict(X));
});

test("forecaster reuses a pretrained model instead of retraining", () => {
  const dataset = makeDataset();
  const series = buildSeriesCollection(dataset, {
    from: dataset.sales[0].date,
    to: dataset.sales[dataset.sales.length - 1].date,
  });
  const trained = trainModels(series, { testDays: 28, warmupDays: 28 });
  const pretrained = trainAndForecast(series, {
    horizon: 14,
    testDays: 28,
    warmupDays: 28,
    pretrained: { p50: trained.p50, p80: trained.p80 },
  });
  const reference = trainAndForecast(series, { horizon: 14, testDays: 28, warmupDays: 28 });
  assert.equal(pretrained.meta.model_source, "pretrained");
  assert.equal(pretrained.meta.train_rows, 0);
  assert.equal(reference.meta.model_source, "trained");
  assert.equal(pretrained.forecasts.length, reference.forecasts.length);
  pretrained.forecasts.forEach((forecast, index) => {
    forecast.future.forEach((row, step) => {
      assert.equal(row.p50, reference.forecasts[index].future[step].p50);
      assert.equal(row.p80, reference.forecasts[index].future[step].p80);
    });
  });
});

test("forecasting service loads a persisted model artifact", async () => {
  const dataset = makeDataset({ days: 140 });
  const series = buildSeriesCollection(dataset, {
    from: dataset.sales[0].date,
    to: dataset.sales[dataset.sales.length - 1].date,
  });
  const trained = trainModels(series, { testDays: 28, warmupDays: 28 });
  const previousPath = process.env.FORECASTING_MODEL_PATH;
  const artifactFile = path.join(os.tmpdir(), `forecasting-artifact-${process.pid}-${Date.now()}.json`);
  process.env.FORECASTING_MODEL_PATH = artifactFile;
  try {
    saveArtifact({
      p50: trained.p50,
      p80: trained.p80,
      asOfDate: "2024-02-04",
      modelConfig: trained.meta.model_config,
    });
    const repository = {
      async loadDataset() {
        return dataset;
      },
    };
    const service = new ForecastingService({ repository, cacheTtlMs: 1000 });
    const demand = await service.getDemandForecasts({
      as_of_date: "2024-02-04",
      history_days: 140,
      horizon: 7,
    });
    assert.equal(demand.meta.model_source, "pretrained");
    assert.equal(demand.meta.train_rows, 0);
    assert.equal(demand.forecasts.length, 2);
  } finally {
    if (previousPath === undefined) delete process.env.FORECASTING_MODEL_PATH;
    else process.env.FORECASTING_MODEL_PATH = previousPath;
    fs.rmSync(artifactFile, { force: true });
  }
});

test("intermittent demand is detected and TSB avoids over-forecasting", () => {
  const sparse = Array.from({ length: 120 }, (_, index) => (index % 9 === 0 ? 2 : 0));
  const dense = Array.from({ length: 120 }, () => 8);
  assert.equal(classifyIntermittent(sparse).isIntermittent, true);
  assert.equal(classifyIntermittent(dense).isIntermittent, false);
  const forecast = tsbForecast(sparse, 7);
  assert.ok(forecast.p50[0] > 0);
  assert.ok(forecast.p50[0] < 2);
  assert.ok(forecast.p80[0] >= forecast.p50[0]);
});

test("stock reconstruction flags stockout days and excludes censored zeros", () => {
  const dates = Array.from({ length: 10 }, (_, index) => addDays("2024-01-01", index));
  const dataset = {
    sales: dates.map((date) => ({
      sku_id: 1,
      branch_id: 1,
      date,
      units: 2,
      revenue: 20,
      profit: 10,
      unit_price: 10,
    })),
    entries: [{ sku_id: 1, branch_id: 1, date: "2024-01-05", units: 20 }],
    stock: [{ sku_id: 1, branch_id: 1, stock: 0 }],
    products: [{ id_product: 1, name: "Demo", cost: 5, list_price: 10, fk_supplier: 1 }],
    suppliers: [{ id_supplier: 1, name: "Sup" }],
    branches: [{ id_branch: 1, name: "Principal" }],
  };
  const series = buildSeriesCollection(dataset, { from: "2024-01-01", to: "2024-01-10" });
  assert.equal(series.length, 1);
  assert.ok(series[0].stats.stockout_days > 0);
  assert.ok(series[0].stockout.includes(1));
});

test("lead time falls back to supplier defaults when product overrides are null", () => {
  const dataset = makeDataset({ days: 30 });
  dataset.products[0].lead_time_min_days = null;
  dataset.products[0].lead_time_max_days = null;
  const series = buildSeriesCollection(dataset, {
    from: dataset.sales[0].date,
    to: dataset.sales[dataset.sales.length - 1].date,
  });
  const product = series.find((item) => item.sku_id === 1);
  assert.equal(product.lead_time_min_days, 4);
  assert.equal(product.lead_time_max_days, 7);
});

test("lead time override takes precedence over product and supplier values", () => {
  const dataset = makeDataset({ days: 30 });
  dataset.products[0].lead_time_min_days = 2;
  dataset.products[0].lead_time_max_days = 3;
  dataset.suppliers[0].lead_time_min_days = 5;
  dataset.suppliers[0].lead_time_max_days = 6;
  const base = {
    from: dataset.sales[0].date,
    to: dataset.sales[dataset.sales.length - 1].date,
  };
  const resolved = buildSeriesCollection(dataset, base).find(
    (item) => item.sku_id === 1
  );
  assert.equal(resolved.lead_time_min_days, 2);
  assert.equal(resolved.lead_time_max_days, 3);

  const overridden = buildSeriesCollection(dataset, {
    ...base,
    leadTimeMin: 10,
    leadTimeMax: 15,
  }).find((item) => item.sku_id === 1);
  assert.equal(overridden.lead_time_min_days, 10);
  assert.equal(overridden.lead_time_max_days, 15);
});

test("demand forecaster returns quantiles, seasonality and metrics", () => {
  const dataset = makeDataset();
  const series = buildSeriesCollection(dataset, {
    from: dataset.sales[0].date,
    to: dataset.sales[dataset.sales.length - 1].date,
  });
  const result = trainAndForecast(series, { horizon: 14, testDays: 28, warmupDays: 28 });
  assert.equal(result.forecasts.length, 2);
  assert.ok(result.metrics.hybrid.wape >= 0);
  assert.ok(Number.isFinite(result.metrics.hybrid.wape));
  assert.ok(result.metrics.seasonal_naive.wape >= 0);
  for (const forecast of result.forecasts) {
    assert.equal(forecast.future.length, 14);
    assert.equal(forecast.seasonality.dow_factors.length, 7);
    assert.equal(forecast.seasonality.month_factors.length, 12);
    for (const row of forecast.future) {
      assert.ok(row.p80 >= row.p50);
      assert.ok(row.p50 >= 0);
    }
  }
  const intermittent = result.forecasts.find((forecast) => forecast.sku_id === 2);
  assert.equal(intermittent.is_intermittent, true);
  assert.equal(intermittent.model, "tsb");
});

test("budget-constrained restocking respects the 2000 soles budget", () => {
  const dataset = makeDataset();
  const series = buildSeriesCollection(dataset, {
    from: dataset.sales[0].date,
    to: dataset.sales[dataset.sales.length - 1].date,
  });
  const { forecasts } = trainAndForecast(series, { horizon: 21, testDays: 28, warmupDays: 28 });
  const plan = buildRestockPlan(forecasts, {
    budget: 2000,
    leadTimeMin: 4,
    leadTimeMax: 7,
    coverageDays: 14,
    serviceLevel: 0.8,
    riskAversion: 0.25,
  });
  assert.equal(plan.parameters.budget, 2000);
  assert.ok(plan.summary.allocated_spend <= 2000);
  assert.equal(plan.items.length, 2);
  assert.ok(plan.summary.expected_profit_protected >= 0);
  assert.ok(plan.items.every((item) => item.allocated_qty >= 0));
  const breakdown = buildRiskBreakdown(forecasts, { leadTimeMin: 4, leadTimeMax: 7, coverageDays: 14 });
  assert.ok(Array.isArray(breakdown.lost_profit_if_stocked_out));
  assert.ok(Array.isArray(breakdown.capital_tied_if_over_ordered));
  assert.ok(zScore(0.8) > 0);
});

test("restock plan includes recent performance and two-month coverage", () => {
  const dataset = makeDataset();
  const series = buildSeriesCollection(dataset, {
    from: dataset.sales[0].date,
    to: dataset.sales[dataset.sales.length - 1].date,
  });
  const { forecasts } = trainAndForecast(series, {
    horizon: 70,
    testDays: 28,
    warmupDays: 28,
  });
  assert.ok(forecasts.every((forecast) => forecast.recent_stats.days > 0));
  const plan = buildRestockPlan(forecasts, { budget: 2000 });
  assert.equal(plan.parameters.coverage_days, 60);
  const item = plan.items.find((entry) => entry.sku_id === 1);
  assert.ok(item.priority_rank >= 1);
  assert.ok(item.forecast_score >= 0);
  assert.ok(item.recent_units >= 0);
  assert.ok(item.suggested_order_qty > 0);
});

test("projected demand is the main driver of restock priority", () => {
  const future = (p50, p80) =>
    Array.from({ length: 70 }, () => ({ p50, p80 }));
  const base = {
    branch_id: 1,
    name: "Producto",
    cost: 10,
    list_price: 20,
    lowest_price: 18,
    lead_time_min_days: 4,
    lead_time_max_days: 7,
    current_stock: 5,
    history_stats: {
      mean: 1,
      std: 0.2,
      nonzero_ratio: 0.5,
    },
    recent_stats: {
      days: 90,
      units: 90,
      avg_daily: 1,
      revenue: 1800,
      profit: 900,
      margin_ratio: 0.5,
      nonzero_ratio: 0.5,
      growth: 0,
      stockout_rate: 0,
    },
  };
  const plan = buildRestockPlan(
    [
      { ...base, sku_id: 1, future: future(5, 8) },
      { ...base, sku_id: 2, future: future(0.2, 0.3) },
    ],
    { budget: 5000, coverageDays: 60 }
  );
  const highProjection = plan.items.find((entry) => entry.sku_id === 1);
  const lowProjection = plan.items.find((entry) => entry.sku_id === 2);
  assert.ok(highProjection.forecast_score > lowProjection.forecast_score);
  assert.ok(highProjection.priority_score > lowProjection.priority_score);
  assert.equal(highProjection.priority_rank, 1);
});

test("restock consolidation uses total inventory stock across branches", () => {
  const future = Array.from({ length: 70 }, (_, index) => ({
    date: addDays("2024-01-01", index),
    p50: index === 0 ? 0.1 : 0,
    p80: index === 0 ? 0.2 : 0,
  }));
  const makeForecast = (branchId, stock, demand) => ({
    sku_id: 570,
    branch_id: branchId,
    name: "Licuadora Oster",
    cost: 189,
    list_price: 250,
    lowest_price: 220,
    lead_time_min_days: 4,
    lead_time_max_days: 7,
    current_stock: stock,
    has_stock: true,
    history_stats: { mean: demand, std: 1, nonzero_ratio: 0.5, days: 420 },
    recent_stats: {
      days: 90,
      units: 10,
      revenue: 2500,
      profit: 600,
      margin_ratio: 0.24,
      nonzero_ratio: 0.2,
      growth: 0,
      stockout_rate: 0,
    },
    future: future.map((row) => ({
      ...row,
      p50: demand,
      p80: demand * 1.5,
    })),
  });
  const allBranches = consolidateForecastsBySku([
    makeForecast(1, 0, 0.1),
    makeForecast(4, 1, 0),
  ]);
  assert.equal(allBranches.length, 1);
  assert.equal(allBranches[0].current_stock, 1);
  assert.equal(allBranches[0].branch_id, null);
  assert.equal(allBranches[0].future[0].p50, 0.1);
  assert.equal(allBranches[0].future[0].projected_stock, 0.9);

  const selectedBranch = consolidateForecastsBySku(
    [makeForecast(1, 0, 0.1), makeForecast(4, 1, 0)],
    { branchId: 1 }
  );
  assert.equal(selectedBranch.length, 1);
  assert.equal(selectedBranch[0].current_stock, 1);
  assert.equal(selectedBranch[0].branch_id, 1);
  assert.equal(selectedBranch[0].future[0].p50, 0.1);
});

test("profitability score uses absolute profit instead of margin over cost", () => {
  const future = Array.from({ length: 70 }, () => ({ p50: 1, p80: 1.5 }));
  const base = {
    branch_id: 1,
    name: "Producto",
    lead_time_min_days: 4,
    lead_time_max_days: 7,
    current_stock: 5,
    history_stats: { mean: 1, std: 0.2, nonzero_ratio: 0.5 },
    recent_stats: {
      days: 90,
      units: 10,
      revenue: 15,
      profit: 5,
      margin_ratio: 0.5,
      nonzero_ratio: 0.5,
      growth: 0,
      stockout_rate: 0,
    },
    future,
  };
  const forecasts = [
    { ...base, sku_id: 1, cost: 1, list_price: 1.5, lowest_price: 1.4 },
    {
      ...base,
      sku_id: 2,
      cost: 100,
      list_price: 110,
      lowest_price: 105,
      recent_stats: {
        ...base.recent_stats,
        revenue: 1100,
        profit: 100,
        margin_ratio: 0.1,
      },
    },
  ];
  const plan = buildRestockPlan(forecasts, { budget: 10000 });
  const cheap = plan.items.find((item) => item.sku_id === 1);
  const expensive = plan.items.find((item) => item.sku_id === 2);
  assert.equal(resolveProfitReference(forecasts), 52.5);
  assert.ok(cheap.capital_efficiency > expensive.capital_efficiency);
  assert.ok(expensive.recent_profit > cheap.recent_profit);
  assert.ok(expensive.profitability_score > cheap.profitability_score);
});

test("restock plan separates out-of-stock, running-out-soon and healthy items", () => {
  const future = Array.from({ length: 70 }, () => ({ p50: 1, p80: 1.5 }));
  const base = {
    branch_id: 1,
    name: "Producto",
    cost: 10,
    list_price: 20,
    lowest_price: 18,
    lead_time_min_days: 4,
    lead_time_max_days: 7,
    history_stats: { mean: 1, std: 0.2, nonzero_ratio: 0.5 },
    recent_stats: {
      days: 90,
      units: 90,
      revenue: 1800,
      profit: 900,
      margin_ratio: 0.5,
      nonzero_ratio: 0.5,
      growth: 0,
      stockout_rate: 0,
    },
    future,
  };
  const plan = buildRestockPlan(
    [
      { ...base, sku_id: 1, name: "Agotado", current_stock: 0 },
      { ...base, sku_id: 2, name: "Por agotarse", current_stock: 5 },
      { ...base, sku_id: 3, name: "Saludable", current_stock: 60 },
    ],
    { budget: 10000, leadTimeMax: 7, coverageDays: 60 }
  );
  const outOfStock = plan.items.find((item) => item.sku_id === 1);
  const runningOut = plan.items.find((item) => item.sku_id === 2);
  const healthy = plan.items.find((item) => item.sku_id === 3);
  assert.equal(outOfStock.stock_urgency, "out_of_stock");
  assert.equal(outOfStock.urgency_score, 100);
  assert.equal(runningOut.stock_urgency, "running_out_soon");
  assert.equal(runningOut.days_until_stockout, 5);
  assert.ok(runningOut.urgency_score > 0 && runningOut.urgency_score < 100);
  assert.equal(healthy.stock_urgency, "healthy");
  assert.equal(healthy.urgency_score, 0);
  assert.equal(plan.parameters.soon_days, 7);
  assert.deepEqual(
    plan.soon_to_run_out.map((item) => item.sku_id),
    [2]
  );
  assert.equal(plan.summary.items_out_of_stock, 1);
  assert.equal(plan.summary.items_running_out_soon, 1);
  assert.equal(plan.summary.items_healthy, 1);
});

test("stale products are hidden unless they are top-100 profitable in the last year", () => {
  const forecasts = [
    { sku_id: 1, name: "Vende reciente" },
    { sku_id: 2, name: "Estancado" },
    { sku_id: 3, name: "Estancado pero rentable" },
    { sku_id: 4, name: "Nunca vendio" },
  ];
  const sales = [
    { sku_id: 1, date: "2024-01-30", units: 1, profit: 50 },
    { sku_id: 2, date: "2022-12-01", units: 1, profit: 99999 },
    { sku_id: 2, date: "2023-06-01", units: 1, profit: 100 },
    { sku_id: 3, date: "2023-06-01", units: 1, profit: 500 },
  ];
  const result = filterStaleSkus(forecasts, sales, {
    asOfDate: "2024-02-01",
    staleDays: 180,
    profitWindowDays: 365,
    topProfitCount: 1,
  });
  assert.deepEqual(
    result.forecasts.map((forecast) => forecast.sku_id),
    [1, 3]
  );
  assert.deepEqual(
    result.excluded.map((item) => item.sku_id),
    [2, 4]
  );
  const stale = result.excluded.find((item) => item.sku_id === 2);
  assert.equal(stale.profit_last_year, 100);
  assert.ok(stale.days_since_last_sale > 180);
  assert.equal(result.parameters.stale_days, 180);
  assert.equal(result.parameters.top_profit_products, 1);
});

test("discontinued products are excluded from restock and can be re-enabled", () => {
  const forecasts = [
    { sku_id: 1, name: "Activo" },
    { sku_id: 2, name: "Descontinuado" },
  ];
  const result = filterDiscontinuedSkus(forecasts, [
    { id_product: 1, is_discontinued: false },
    { id_product: 2, is_discontinued: true },
  ]);
  assert.deepEqual(
    result.forecasts.map((forecast) => forecast.sku_id),
    [1]
  );
  assert.deepEqual(
    result.excluded.map((item) => item.sku_id),
    [2]
  );
  assert.deepEqual(result.discontinued_skus, [2]);

  const reenabled = filterDiscontinuedSkus(forecasts, [
    { id_product: 1, is_discontinued: false },
    { id_product: 2, is_discontinued: false },
  ]);
  assert.deepEqual(
    reenabled.forecasts.map((forecast) => forecast.sku_id),
    [1, 2]
  );
  assert.equal(reenabled.excluded.length, 0);
  assert.deepEqual(reenabled.discontinued_skus, []);
});

test("forecasting service omits discontinued products from restock and risk", async () => {
  const dataset = makeDataset({ days: 140 });
  dataset.products[1].is_discontinued = true;
  const repository = {
    async loadDataset() {
      return dataset;
    },
  };
  const service = new ForecastingService({ repository, cacheTtlMs: 1000 });
  const restock = await service.getRestockPlan({
    as_of_date: "2024-02-04",
    history_days: 140,
    budget: 2000,
    lead_time_min: 4,
    lead_time_max: 7,
    coverage_days: 7,
  });
  assert.ok(!restock.items.some((item) => item.sku_id === 2));
  assert.equal(restock.filter.discontinued_items, 1);
  assert.deepEqual(restock.filter.discontinued_skus, [2]);

  const risk = await service.getRiskBreakdown({
    as_of_date: "2024-02-04",
    history_days: 140,
    lead_time_min: 4,
    lead_time_max: 7,
    coverage_days: 7,
  });
  assert.equal(risk.parameters.discontinued_items, 1);
  assert.deepEqual(risk.parameters.discontinued_skus, [2]);
  assert.ok(!risk.lost_profit_if_stocked_out.some((item) => item.sku_id === 2));
});

test("forecasting uses a fixed 4-20 day lead time", async () => {
  const dataset = makeDataset({ days: 140 });
  dataset.products[0].lead_time_min_days = 2;
  dataset.products[0].lead_time_max_days = 3;
  const repository = {
    async loadDataset() {
      return dataset;
    },
  };
  const service = new ForecastingService({ repository, cacheTtlMs: 1000 });
  const demand = await service.getDemandForecasts({
    as_of_date: "2024-02-04",
    history_days: 140,
    horizon: 30,
    lead_time_min: 10,
    lead_time_max: 15,
  });
  assert.ok(
    demand.forecasts.every(
      (forecast) =>
        forecast.lead_time_min_days === 4 &&
        forecast.lead_time_max_days === 20
    )
  );

  const restock = await service.getRestockPlan({
    as_of_date: "2024-02-04",
    history_days: 140,
    budget: 2000,
    lead_time_min: 10,
    lead_time_max: 15,
    coverage_days: 7,
  });
  assert.equal(restock.parameters.lead_time_min, 4);
  assert.equal(restock.parameters.lead_time_max, 20);
  assert.equal(restock.parameters.soon_days, 20);
  assert.ok(
    restock.items.every(
      (item) =>
        item.lead_time_min_days === 4 && item.lead_time_max_days === 20
    )
  );
});

test("restock serves a precomputed snapshot and falls back to live when incompatible", async () => {
  const dataset = makeDataset({ days: 140 });
  let loads = 0;
  const repository = {
    async loadDataset() {
      loads += 1;
      return dataset;
    },
  };
  const service = new ForecastingService({
    repository,
    cacheTtlMs: 1000,
    snapshotStore: new RestockSnapshotStore({ refreshHour: 9, refreshMinute: 0 }),
  });

  const snapshot = await service.buildRestockSnapshot({
    as_of_date: "2024-02-04",
    history_days: 140,
  });
  service.snapshotStore.set(snapshot);
  const loadsAfterSnapshot = loads;

  const restock = await service.getRestockPlan({
    as_of_date: "2024-02-04",
    history_days: 140,
    budget: 2000,
    coverage_days: 7,
  });
  assert.equal(restock.snapshot.served_from, "snapshot");
  assert.equal(loads, loadsAfterSnapshot);
  assert.equal(restock.parameters.lead_time_min, 4);
  assert.equal(restock.parameters.lead_time_max, 20);

  const live = await service.getRestockPlan({
    as_of_date: "2024-02-03",
    history_days: 140,
    budget: 2000,
    coverage_days: 7,
  });
  assert.equal(live.snapshot.served_from, "live");
  assert.ok(loads > loadsAfterSnapshot);
});

test("snapshot scheduler computes the next 9am Lima run", () => {
  const moment = require("moment-timezone");
  const morning = moment.tz("2024-02-04T08:00:00", "America/Lima");
  assert.equal(msUntilNextRun(9, 0, morning), 60 * 60 * 1000);
  const afternoon = moment.tz("2024-02-04T10:00:00", "America/Lima");
  assert.equal(msUntilNextRun(9, 0, afternoon), 23 * 60 * 60 * 1000);
});

test("forecasting service integrates with an in-memory repository", async () => {
  const dataset = makeDataset({ days: 140 });
  const repository = {
    async loadDataset() {
      return dataset;
    },
  };
  const service = new ForecastingService({ repository, cacheTtlMs: 1000 });
  const demand = await service.getDemandForecasts({
    as_of_date: "2024-02-04",
    history_days: 140,
    horizon: 7,
  });
  assert.equal(demand.forecasts.length, 2);
  assert.equal(demand.filters.horizon, 7);
  assert.ok(demand.meta.train_rows > 0 || demand.meta.model_source === "pretrained");
  assert.ok(demand.forecasts.every((forecast) => forecast.recent_stats.days > 0));

  dataset.stock.push({ sku_id: 1, branch_id: 2, stock: 5 });
  dataset.branches.push({ id_branch: 2, name: "Deposito" });

  const branchDemand = await service.getDemandForecasts({
    as_of_date: "2024-02-04",
    history_days: 140,
    horizon: 7,
    branch_id: 1,
    sku_id: 1,
    refresh: true,
  });
  assert.equal(branchDemand.forecasts.length, 1);
  assert.equal(branchDemand.forecasts[0].branch_id, 1);
  assert.equal(branchDemand.forecasts[0].current_stock, 35);

  const restock = await service.getRestockPlan({
    as_of_date: "2024-02-04",
    history_days: 140,
    budget: 2000,
    lead_time_min: 4,
    lead_time_max: 7,
    coverage_days: 7,
  });
  assert.equal(restock.parameters.budget, 2000);
  assert.equal(restock.parameters.stock_scope, "all_branches");
  assert.ok(restock.summary.allocated_spend <= 2000);
  const consolidatedSku = restock.items.find((item) => item.sku_id === 1);
  assert.equal(consolidatedSku.current_stock, 35);

  const risk = await service.getRiskBreakdown({
    as_of_date: "2024-02-04",
    history_days: 140,
    lead_time_min: 4,
    lead_time_max: 7,
    coverage_days: 7,
  });
  assert.ok(Array.isArray(risk.lost_profit_if_stocked_out));
});

test("sales history window never exceeds one year", () => {
  const capped = normalizeCommonParams({ as_of_date: "2024-02-04", history_days: 730 });
  assert.equal(capped.historyDays, 365);
  assert.equal(capped.from, addDays("2024-02-04", -364));

  const olderFrom = normalizeCommonParams({ as_of_date: "2024-02-04", from: "2020-01-01" });
  assert.equal(olderFrom.from, addDays("2024-02-04", -364));
});

test("manual refresh respects the cooldown and avoids repeat heavy loads", async () => {
  const dataset = makeDataset({ days: 140 });
  let loads = 0;
  const repository = {
    async loadDataset() {
      loads += 1;
      return dataset;
    },
  };
  const service = new ForecastingService({
    repository,
    cacheTtlMs: 60_000,
    snapshotStore: null,
    refreshCooldownMs: 60_000,
  });
  const params = {
    as_of_date: "2024-02-04",
    history_days: 140,
    budget: 2000,
    coverage_days: 7,
    refresh: true,
  };
  await service.getRestockPlan(params);
  assert.equal(loads, 1);
  // Segundo refresh dentro del cooldown: no vuelve a golpear Postgres.
  await service.getRestockPlan(params);
  assert.equal(loads, 1);
  assert.equal(service.getRestockSnapshotStatus().manual_refresh_allowed, false);
});

test("snapshot persists to disk and survives a restart", async () => {
  const persistPath = path.join(
    os.tmpdir(),
    `restock-snapshot-${process.pid}-${Date.now()}.json.gz`
  );
  const silentLogger = { log() {}, error() {} };
  const fakeSnapshot = {
    asOfDate: "2024-02-04",
    from: "2023-02-05",
    historyDays: 365,
    leadTimeMin: 4,
    leadTimeMax: 20,
    coverageMaxDays: 180,
    horizon: 202,
    forecasts: [],
    sales: [],
    products: [],
    metrics: {},
    meta: {},
    builtAt: Date.now(),
  };
  try {
    const store = new RestockSnapshotStore({ persistPath, logger: silentLogger });
    await store.refresh(async () => fakeSnapshot);
    assert.ok(fs.existsSync(persistPath));

    const restored = new RestockSnapshotStore({ persistPath, logger: silentLogger });
    const loaded = restored.loadFromDisk();
    assert.equal(loaded.asOfDate, "2024-02-04");
    assert.equal(restored.get().historyDays, 365);
  } finally {
    fs.rmSync(persistPath, { force: true });
  }
});

test("an existing snapshot is served while the daily job has not run", async () => {
  const moment = require("moment-timezone");
  const dataset = makeDataset({ days: 140 });
  const repository = {
    async loadDataset() {
      return dataset;
    },
  };
  const service = new ForecastingService({
    repository,
    cacheTtlMs: 1000,
    snapshotStore: new RestockSnapshotStore({
      refreshHour: 9,
      refreshMinute: 0,
      persistPath: null,
    }),
  });
  const yesterday = addDays(moment().tz("America/Lima").format("YYYY-MM-DD"), -1);
  const snapshot = await service.buildRestockSnapshot({
    as_of_date: yesterday,
    history_days: 140,
  });
  service.snapshotStore.set(snapshot);

  const restock = await service.getRestockPlan({
    history_days: 140,
    budget: 2000,
    coverage_days: 7,
  });
  assert.equal(restock.snapshot.served_from, "snapshot");
  assert.equal(restock.snapshot.as_of_date, yesterday);
});

test("discontinuing a product takes effect on an existing snapshot", async () => {
  const dataset = makeDataset({ days: 140 });
  let discontinued = false;
  const repository = {
    async loadDataset() {
      return dataset;
    },
    async loadDiscontinuedFlags() {
      return dataset.products.map((product) => ({
        id_product: product.id_product,
        is_discontinued: product.id_product === 1 ? discontinued : false,
      }));
    },
  };
  const service = new ForecastingService({
    repository,
    cacheTtlMs: 1000,
    snapshotStore: new RestockSnapshotStore({ persistPath: null }),
  });
  const snapshot = await service.buildRestockSnapshot({
    as_of_date: "2024-02-04",
    history_days: 140,
  });
  service.snapshotStore.set(snapshot);

  const params = {
    as_of_date: "2024-02-04",
    history_days: 140,
    budget: 2000,
    coverage_days: 7,
  };
  const before = await service.getRestockPlan(params);
  assert.ok(before.items.some((item) => item.sku_id === 1));

  discontinued = true;
  const after = await service.getRestockPlan(params);
  assert.ok(!after.items.some((item) => item.sku_id === 1));
  assert.deepEqual(after.filter.discontinued_skus, [1]);
});

test("forecasting pool is bounded and read-only", () => {
  const { forecastingPool } = require("../config/db");
  assert.equal(forecastingPool.options.application_name, "inventario-forecasting");
  assert.match(
    String(forecastingPool.options.options || ""),
    /default_transaction_read_only=on/
  );
  assert.ok(Number(forecastingPool.options.statement_timeout) > 0);
  assert.ok(Number(forecastingPool.options.connectionTimeoutMillis) > 0);
  assert.equal(
    Number(forecastingPool.options.max),
    Number(process.env.FORECASTING_DB_POOL_MAX || 2)
  );
});
