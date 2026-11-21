const { calendarFeatures, eachDate, seasonalityProfile, yearOverYearFactor } = require("./calendar");

const FEATURE_NAMES = [
  "sku_id",
  "branch_id",
  "category_id",
  "supplier_id",
  "dow",
  "month",
  "week_of_year",
  "day_of_month",
  "day_of_year",
  "is_weekend",
  "is_holiday",
  "is_pay_cycle",
  "is_peak_season",
  "sin_doy",
  "cos_doy",
  "sin_dow",
  "cos_dow",
  "lag_1",
  "lag_7",
  "lag_14",
  "lag_28",
  "roll_mean_7",
  "roll_mean_14",
  "roll_mean_28",
  "roll_std_7",
  "roll_max_7",
  "days_since_last_sale",
  "nonzero_ratio_28",
  "price_unit",
  "price_lag_1",
  "price_ratio",
  "stock_start",
  "stock_end",
  "stockout_flag",
  "stockout_lag_1",
  "yoy_factor",
];

function number(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (!values.length) return 0;
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function keyOf(skuId, branchId) {
  return `${skuId}:${branchId}`;
}

function buildSeriesCollection(dataset, options = {}) {
  const from = options.from;
  const to = options.to;
  const dates = eachDate(from, to);
  const productsById = new Map((dataset.products || []).map((product) => [Number(product.id_product), product]));
  const suppliersById = new Map((dataset.suppliers || []).map((supplier) => [Number(supplier.id_supplier), supplier]));
  const salesBySeries = new Map();
  const entriesBySeries = new Map();
  const stockBySeries = new Map();

  for (const row of dataset.sales || []) {
    const key = keyOf(row.sku_id, row.branch_id);
    if (!salesBySeries.has(key)) salesBySeries.set(key, new Map());
    salesBySeries.get(key).set(String(row.date).slice(0, 10), row);
  }
  for (const row of dataset.entries || []) {
    const key = keyOf(row.sku_id, row.branch_id);
    if (!entriesBySeries.has(key)) entriesBySeries.set(key, new Map());
    entriesBySeries.get(key).set(String(row.date).slice(0, 10), row);
  }
  for (const row of dataset.stock || []) {
    stockBySeries.set(keyOf(row.sku_id, row.branch_id), number(row.stock));
  }

  const keys = new Set([...salesBySeries.keys(), ...stockBySeries.keys()]);
  const seriesList = [];
  const defaultLeadTimeMin = number(options.defaultLeadTimeMin, 4);
  const defaultLeadTimeMax = number(options.defaultLeadTimeMax, 7);
  const overrideLeadTimeMin = options.leadTimeMin ?? options.lead_time_min;
  const overrideLeadTimeMax = options.leadTimeMax ?? options.lead_time_max;
  const hasOverride = (value) => value !== null && value !== undefined && value !== "";

  for (const key of keys) {
    const [skuId, branchId] = key.split(":").map(Number);
    const salesMap = salesBySeries.get(key) || new Map();
    const entriesMap = entriesBySeries.get(key) || new Map();
    const product = productsById.get(skuId) || {};
    const supplier = suppliersById.get(Number(product.fk_supplier)) || {};
    const y = dates.map((date) => number(salesMap.get(date)?.units));
    const price = dates.map((date) => {
      const value = salesMap.get(date)?.unit_price;
      return value === null || value === undefined ? null : number(value);
    });
    const inbound = dates.map((date) => number(entriesMap.get(date)?.units));
    const currentStock = stockBySeries.has(key) ? stockBySeries.get(key) : null;
    const hasStock = currentStock !== null;
    const stockEnd = new Array(dates.length).fill(0);
    const stockStart = new Array(dates.length).fill(0);
    const stockout = new Array(dates.length).fill(0);

    if (dates.length) {
      stockEnd[dates.length - 1] = hasStock ? currentStock : 0;
      for (let index = dates.length - 2; index >= 0; index -= 1) {
        stockEnd[index] = stockEnd[index + 1] + y[index + 1] - inbound[index + 1];
      }
      for (let index = 0; index < dates.length; index += 1) {
        stockStart[index] = index > 0 ? stockEnd[index - 1] : stockEnd[index] + y[index] - inbound[index];
        stockout[index] = hasStock && (stockStart[index] <= 0 || stockEnd[index] <= 0) ? 1 : 0;
      }
    }

    const historyRows = dates.map((date, index) => ({ date, units: y[index] }));
    const demandRows = historyRows.filter((row, index) => !(stockout[index] && y[index] === 0));
    const nonzeroDays = y.filter((value) => value > 0).length;
    const cost = number(product.cost);
    const lastPrice = [...price].reverse().find((value) => value !== null && value > 0)
      || number(product.list_price)
      || cost
      || 0;
    const resolvedLeadTimeMin = number(
      product.lead_time_min_days,
      number(supplier.lead_time_min_days, defaultLeadTimeMin)
    );
    const resolvedLeadTimeMax = number(
      product.lead_time_max_days,
      number(supplier.lead_time_max_days, defaultLeadTimeMax)
    );
    const leadTimeMin = hasOverride(overrideLeadTimeMin)
      ? number(overrideLeadTimeMin, resolvedLeadTimeMin)
      : resolvedLeadTimeMin;
    const leadTimeMax = Math.max(
      leadTimeMin,
      hasOverride(overrideLeadTimeMax)
        ? number(overrideLeadTimeMax, resolvedLeadTimeMax)
        : resolvedLeadTimeMax
    );
    const stockoutDays = stockout.reduce((sum, value) => sum + value, 0);
    const recentDays = Math.min(90, dates.length);
    const recentStart = Math.max(0, dates.length - recentDays);
    let recentUnits = 0;
    let recentRevenue = 0;
    let recentProfit = 0;
    let recentNonzeroDays = 0;
    let recentStockoutDays = 0;
    for (let index = recentStart; index < dates.length; index += 1) {
      const units = number(y[index]);
      const unitPrice = price[index] === null || price[index] === undefined ? lastPrice : number(price[index]);
      recentUnits += units;
      recentRevenue += units * unitPrice;
      recentProfit += units * (unitPrice - cost);
      if (units > 0) recentNonzeroDays += 1;
      if (stockout[index]) recentStockoutDays += 1;
    }
    const previousStart = Math.max(0, recentStart - recentDays);
    let previousUnits = 0;
    for (let index = previousStart; index < recentStart; index += 1) {
      previousUnits += number(y[index]);
    }
    const recentGrowth = previousUnits > 0 ? recentUnits / previousUnits - 1 : null;
    const recentUnitPrice = recentUnits > 0 ? recentRevenue / recentUnits : lastPrice;
    const recentMarginRatio = recentRevenue > 0
      ? recentProfit / recentRevenue
      : recentUnitPrice > 0
        ? Math.max(0, recentUnitPrice - cost) / recentUnitPrice
        : 0;
    const recentStats = {
      days: recentDays,
      units: Number(recentUnits.toFixed(2)),
      avg_daily: Number((recentDays > 0 ? recentUnits / recentDays : 0).toFixed(4)),
      revenue: Number(recentRevenue.toFixed(2)),
      profit: Number(recentProfit.toFixed(2)),
      margin_ratio: Number(recentMarginRatio.toFixed(4)),
      nonzero_ratio: Number((recentDays > 0 ? recentNonzeroDays / recentDays : 0).toFixed(4)),
      stockout_rate: Number((recentDays > 0 ? recentStockoutDays / recentDays : 0).toFixed(4)),
      growth: recentGrowth === null ? null : Number(recentGrowth.toFixed(4)),
      unit_price: Number(recentUnitPrice.toFixed(2)),
    };

    seriesList.push({
      sku_id: skuId,
      branch_id: branchId,
      name: product.name || `SKU ${skuId}`,
      cost,
      list_price: number(product.list_price, lastPrice),
      lowest_price: number(product.lowest_price),
      category_id: number(product.fk_category),
      supplier_id: number(product.fk_supplier),
      supplier_name: supplier.name || null,
      lead_time_min_days: leadTimeMin,
      lead_time_max_days: leadTimeMax,
      dates,
      y,
      price,
      inbound,
      stock_start: stockStart,
      stock_end: stockEnd,
      stockout,
      has_stock: hasStock,
      current_stock: hasStock ? currentStock : 0,
      last_price: lastPrice,
      history_rows: historyRows,
      recent_stats: recentStats,
      seasonality: seasonalityProfile(demandRows),
      yoy_growth: yearOverYearFactor(demandRows),
      stats: {
        mean: mean(y),
        std: standardDeviation(y),
        nonzero_days: nonzeroDays,
        nonzero_ratio: y.length ? nonzeroDays / y.length : 0,
        stockout_days: stockoutDays,
        stockout_rate: y.length ? stockoutDays / y.length : 0,
        avg_nonzero: nonzeroDays ? mean(y.filter((value) => value > 0)) : 0,
      },
    });
  }

  return seriesList.sort((a, b) => a.sku_id - b.sku_id || a.branch_id - b.branch_id);
}

function lastKnownPrice(series, index) {
  for (let position = Math.min(index, series.price.length - 1); position >= 0; position -= 1) {
    const value = series.price[position];
    if (value !== null && value !== undefined && value > 0) return value;
  }
  return series.last_price || series.list_price || series.cost || 0;
}

function priorValues(series, index, windowSize) {
  const start = Math.max(0, index - windowSize);
  return series.y.slice(start, index);
}

function featureRow(series, index, options = {}) {
  const y = series.y;
  const calendar = calendarFeatures(series.dates[index], options.calendar || {});
  const lag = (distance) => (index - distance >= 0 ? number(y[index - distance]) : 0);
  const prior7 = priorValues(series, index, 7);
  const prior14 = priorValues(series, index, 14);
  const prior28 = priorValues(series, index, 28);
  const priceUnit = lastKnownPrice(series, index);
  const priorPrices = series.price
    .slice(Math.max(0, index - 7), index)
    .filter((value) => value !== null && value !== undefined && value > 0);
  const priceBaseline = priorPrices.length ? mean(priorPrices) : priceUnit;
  let lastSaleIndex = -1;
  for (let position = index - 1; position >= 0; position -= 1) {
    if (number(y[position]) > 0) {
      lastSaleIndex = position;
      break;
    }
  }
  const daysSinceLastSale = lastSaleIndex >= 0 ? index - lastSaleIndex : Math.min(index + 1, 365);
  const nonzeroRatio = prior28.length ? prior28.filter((value) => value > 0).length / prior28.length : 0;
  const stockStart = series.has_stock ? Math.max(0, number(series.stock_start[index])) : 0;
  const stockEnd = series.has_stock ? Math.max(0, number(series.stock_end[index])) : 0;
  const stockoutFlag = series.has_stock ? number(series.stockout[index]) : 0;
  const stockoutLag = index > 0 && series.has_stock ? number(series.stockout[index - 1]) : 0;

  return [
    series.sku_id,
    series.branch_id,
    series.category_id,
    series.supplier_id,
    calendar.dow,
    calendar.month,
    calendar.week_of_year,
    calendar.day_of_month,
    calendar.day_of_year,
    calendar.is_weekend,
    calendar.is_holiday,
    calendar.is_pay_cycle,
    calendar.is_peak_season,
    calendar.sin_doy,
    calendar.cos_doy,
    calendar.sin_dow,
    calendar.cos_dow,
    lag(1),
    lag(7),
    lag(14),
    lag(28),
    mean(prior7),
    mean(prior14),
    mean(prior28),
    standardDeviation(prior7),
    prior7.length ? Math.max(...prior7) : 0,
    daysSinceLastSale,
    nonzeroRatio,
    priceUnit,
    index > 0 ? lastKnownPrice(series, index - 1) : priceUnit,
    Math.max(0, Math.min(10, priceUnit / Math.max(priceBaseline, 0.01))),
    stockStart,
    stockEnd,
    stockoutFlag,
    stockoutLag,
    series.yoy_growth,
  ];
}

function historyStats(series) {
  return {
    mean: series.stats.mean,
    std: series.stats.std,
    nonzero_ratio: series.stats.nonzero_ratio,
    avg_nonzero: series.stats.avg_nonzero,
    stockout_days: series.stats.stockout_days,
    stockout_rate: series.stats.stockout_rate,
    days: series.y.length,
  };
}

module.exports = {
  FEATURE_NAMES,
  buildSeriesCollection,
  featureRow,
  historyStats,
  lastKnownPrice,
  mean,
  standardDeviation,
};
