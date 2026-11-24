const { addDays, diffDays } = require("./calendar");
const { mean } = require("./features");

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function zScore(serviceLevel) {
  const p = clamp(Number(serviceLevel) || 0.8, 0.5, 0.999);
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q;
  let r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function futureValue(future, index, field) {
  if (!future.length) return 0;
  const row = future[Math.min(Math.max(0, index), future.length - 1)];
  return Math.max(0, Number(row[field]) || 0);
}

function sumFuture(future, start, endExclusive, field) {
  let total = 0;
  for (let index = start; index < endExclusive; index += 1) total += futureValue(future, index, field);
  return total;
}

function aggregateHistoryStats(statsList) {
  const valid = statsList.filter(Boolean);
  if (!valid.length) return {};
  const totalDays = valid.reduce((sum, stats) => sum + (Number(stats.days) || 0), 0) || 1;
  const nonzeroDays = valid.reduce(
    (sum, stats) => sum + (Number(stats.nonzero_ratio) || 0) * (Number(stats.days) || 0),
    0
  );
  const stockoutDays = valid.reduce((sum, stats) => sum + (Number(stats.stockout_days) || 0), 0);
  return {
    mean: valid.reduce((sum, stats) => sum + (Number(stats.mean) || 0), 0),
    std: Math.sqrt(
      valid.reduce((sum, stats) => sum + (Number(stats.std) || 0) ** 2, 0)
    ),
    nonzero_ratio: nonzeroDays / totalDays,
    avg_nonzero: valid.reduce((sum, stats) => sum + (Number(stats.avg_nonzero) || 0), 0),
    stockout_days: stockoutDays,
    stockout_rate: stockoutDays / totalDays,
    days: Math.max(...valid.map((stats) => Number(stats.days) || 0)),
  };
}

function aggregateRecentStats(statsList) {
  const valid = statsList.filter(Boolean);
  if (!valid.length) return {};
  const days = Math.max(...valid.map((stats) => Number(stats.days) || 0));
  const units = valid.reduce((sum, stats) => sum + (Number(stats.units) || 0), 0);
  const revenue = valid.reduce((sum, stats) => sum + (Number(stats.revenue) || 0), 0);
  const profit = valid.reduce((sum, stats) => sum + (Number(stats.profit) || 0), 0);
  const weightedByUnits = (field) => {
    let numerator = 0;
    let denominator = 0;
    for (const stats of valid) {
      const weight = Number(stats.units) || 0;
      numerator += (Number(stats[field]) || 0) * weight;
      denominator += weight;
    }
    return denominator > 0 ? numerator / denominator : 0;
  };
  const weightedByDays = (field) => {
    let numerator = 0;
    let denominator = 0;
    for (const stats of valid) {
      const weight = Number(stats.days) || 0;
      numerator += (Number(stats[field]) || 0) * weight;
      denominator += weight;
    }
    return denominator > 0 ? numerator / denominator : 0;
  };
  return {
    days,
    units: Number(units.toFixed(2)),
    avg_daily: Number((days > 0 ? units / days : 0).toFixed(4)),
    revenue: Number(revenue.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    margin_ratio: revenue > 0 ? Number((profit / revenue).toFixed(4)) : 0,
    nonzero_ratio: Number(weightedByDays("nonzero_ratio").toFixed(4)),
    stockout_rate: Number(weightedByDays("stockout_rate").toFixed(4)),
    growth: Number(weightedByUnits("growth").toFixed(4)),
    unit_price: units > 0 ? Number((revenue / units).toFixed(2)) : 0,
  };
}

function consolidateForecastsBySku(forecasts, options = {}) {
  const requestedBranchId = options.branchId ?? options.branch_id ?? null;
  const hasBranch =
    requestedBranchId !== null &&
    requestedBranchId !== undefined &&
    requestedBranchId !== "";
  const groups = new Map();
  for (const forecast of forecasts) {
    const key = String(forecast.sku_id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(forecast);
  }

  const items = [];
  for (const group of groups.values()) {
    const demandGroup = hasBranch
      ? group.filter(
          (forecast) => String(forecast.branch_id) === String(requestedBranchId)
        )
      : group;
    if (demandGroup.length === 0) continue;

    const first = demandGroup[0];
    const futureByDate = new Map();
    for (const forecast of demandGroup) {
      for (const row of forecast.future || []) {
        if (!futureByDate.has(row.date)) {
          futureByDate.set(row.date, {
            date: row.date,
            p50: 0,
            p80: 0,
            baseline_p50: 0,
            baseline_p80: 0,
            projected_stock: 0,
            projected_stockout: 0,
            calendar: row.calendar,
          });
        }
        const target = futureByDate.get(row.date);
        target.p50 += Number(row.p50) || 0;
        target.p80 += Number(row.p80) || 0;
        target.baseline_p50 += Number(row.baseline_p50) || 0;
        target.baseline_p80 += Number(row.baseline_p80) || 0;
        target.projected_stock += Number(row.projected_stock) || 0;
        target.projected_stockout =
          target.projected_stockout || (row.projected_stockout ? 1 : 0);
      }
    }
    const future = [...futureByDate.values()]
      .sort((left, right) => String(left.date).localeCompare(String(right.date)))
      .map((row) => ({
        ...row,
        p50: Number(row.p50.toFixed(4)),
        p80: Number(row.p80.toFixed(4)),
        baseline_p50: Number(row.baseline_p50.toFixed(4)),
        baseline_p80: Number(row.baseline_p80.toFixed(4)),
        projected_stock: Number(row.projected_stock.toFixed(4)),
      }));
    const leadTimeMin = Math.max(
      ...demandGroup.map((forecast) => Number(forecast.lead_time_min_days) || 0)
    );
    const leadTimeMax = Math.max(
      leadTimeMin,
      ...demandGroup.map((forecast) => Number(forecast.lead_time_max_days) || 0)
    );
    const currentStock = group.reduce(
      (sum, forecast) =>
        sum + Math.max(0, Number(forecast.current_stock) || 0),
      0
    );
    const hasStock = group.some((forecast) => forecast.has_stock);
    let projectedStock = hasStock ? Math.max(0, currentStock) : 0;
    for (const row of future) {
      projectedStock = hasStock
        ? Math.max(0, projectedStock - (Number(row.p50) || 0))
        : 0;
      row.projected_stock = hasStock
        ? Number(projectedStock.toFixed(4))
        : null;
      row.projected_stockout = hasStock && projectedStock <= 0 ? 1 : 0;
    }

    items.push({
      ...first,
      branch_id: hasBranch ? first.branch_id : null,
      demand_branch_id: hasBranch ? first.branch_id : null,
      stock_scope: "all_branches",
      current_stock: currentStock,
      has_stock: hasStock,
      lead_time_min_days: leadTimeMin,
      lead_time_max_days: leadTimeMax,
      history_stats: aggregateHistoryStats(
        demandGroup.map((forecast) => forecast.history_stats)
      ),
      recent_stats: aggregateRecentStats(
        demandGroup.map((forecast) => forecast.recent_stats)
      ),
      future,
      is_intermittent: demandGroup.every(
        (forecast) => forecast.is_intermittent
      ),
      model:
        demandGroup.length > 1 ? "consolidated" : first.model,
    });
  }
  return items;
}

function toDateKey(value) {
  return String(value || "").slice(0, 10);
}

function profitBySku(sales, { asOfDate, windowDays }) {
  const to = toDateKey(asOfDate);
  const from = addDays(to, -(Math.max(1, windowDays) - 1));
  const totals = new Map();
  for (const row of sales || []) {
    const date = toDateKey(row.date);
    if (!date || date < from || date > to) continue;
    const sku = Number(row.sku_id);
    if (!Number.isFinite(sku)) continue;
    totals.set(sku, (totals.get(sku) || 0) + (Number(row.profit) || 0));
  }
  return totals;
}

function lastSaleBySku(sales, { asOfDate }) {
  const to = toDateKey(asOfDate);
  const lastSales = new Map();
  for (const row of sales || []) {
    const date = toDateKey(row.date);
    if (!date || date > to || !(Number(row.units) > 0)) continue;
    const sku = Number(row.sku_id);
    if (!Number.isFinite(sku)) continue;
    const current = lastSales.get(sku);
    if (!current || date > current) lastSales.set(sku, date);
  }
  return lastSales;
}

function filterDiscontinuedSkus(forecasts, products) {
  const discontinuedSkus = new Set(
    (products || [])
      .filter(
        (product) =>
          product.is_discontinued === true ||
          product.is_discontinued === "true" ||
          product.is_discontinued === 1
      )
      .map((product) => Number(product.id_product))
      .filter((sku) => Number.isFinite(sku))
  );
  const kept = [];
  const excluded = [];
  for (const forecast of forecasts || []) {
    const sku = Number(forecast.sku_id);
    if (discontinuedSkus.has(sku)) {
      excluded.push({ sku_id: forecast.sku_id, name: forecast.name });
      continue;
    }
    kept.push(forecast);
  }
  return { forecasts: kept, excluded, discontinued_skus: [...discontinuedSkus] };
}

function filterStaleSkus(forecasts, sales, options = {}) {
  const staleDays = Math.max(1, Number(options.staleDays) || 180);
  const profitWindowDays = Math.max(1, Number(options.profitWindowDays) || 365);
  const topProfitCount = Math.max(1, Number(options.topProfitCount) || 100);
  const parameters = {
    stale_days: staleDays,
    profit_window_days: profitWindowDays,
    top_profit_products: topProfitCount,
  };
  const asOfDate = toDateKey(options.asOfDate);
  if (!asOfDate) return { forecasts, excluded: [], parameters };

  const profits = profitBySku(sales, { asOfDate, windowDays: profitWindowDays });
  const topProfitSkus = new Set(
    [...profits.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, topProfitCount)
      .map(([sku]) => sku)
  );
  const lastSales = lastSaleBySku(sales, { asOfDate });
  const kept = [];
  const excluded = [];
  for (const forecast of forecasts) {
    const sku = Number(forecast.sku_id);
    const lastSale = lastSales.get(sku) || null;
    const daysSinceLastSale = lastSale ? diffDays(lastSale, asOfDate) : null;
    const isStale = daysSinceLastSale === null || daysSinceLastSale > staleDays;
    const isTopProfit = topProfitSkus.has(sku);
    if (isStale && !isTopProfit) {
      excluded.push({
        sku_id: forecast.sku_id,
        name: forecast.name,
        days_since_last_sale: daysSinceLastSale,
        profit_last_year: Number((profits.get(sku) || 0).toFixed(2)),
      });
      continue;
    }
    kept.push(forecast);
  }
  return { forecasts: kept, excluded, parameters };
}

function resolveProfitReference(forecasts) {
  const profits = (forecasts || [])
    .map((forecast) => Math.max(0, Number(forecast.recent_stats?.profit) || 0))
    .filter((profit) => profit > 0)
    .sort((left, right) => left - right);
  if (!profits.length) return 0;
  const middle = Math.floor(profits.length / 2);
  return profits.length % 2 === 1
    ? profits[middle]
    : (profits[middle - 1] + profits[middle]) / 2;
}

function normalizeOptions(options = {}) {
  const numberOr = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const leadTimeMin = Math.max(0, numberOr(options.leadTimeMin ?? options.lead_time_min, 4));
  const leadTimeMax = Math.max(leadTimeMin, numberOr(options.leadTimeMax ?? options.lead_time_max, 7));
  return {
    budget: Math.max(0, numberOr(options.budget, 2000)),
    leadTimeMin,
    leadTimeMax,
    coverageDays: Math.max(0, numberOr(options.coverageDays ?? options.coverage_days, 60)),
    serviceLevel: clamp(numberOr(options.serviceLevel ?? options.service_level, 0.8), 0.5, 0.99),
    riskAversion: clamp(numberOr(options.riskAversion ?? options.risk_aversion, 0.25), 0, 1),
    soonDays: Math.max(1, numberOr(options.soonDays ?? options.soon_days, leadTimeMax)),
  };
}

function buildItem(forecast, options) {
  const minLead = Math.max(0, Number(forecast.lead_time_min_days ?? options.leadTimeMin));
  const maxLead = Math.max(minLead, Number(forecast.lead_time_max_days ?? options.leadTimeMax));
  const expectedLead = Math.max(1, Math.round((minLead + maxLead) / 2));
  const future = forecast.future || [];
  const leadDemand = sumFuture(future, 0, expectedLead, "p50");
  const coverageDemand = sumFuture(future, maxLead, maxLead + options.coverageDays, "p50");
  const expectedDemand = leadDemand + coverageDemand;
  const p80Demand = sumFuture(future, 0, maxLead + options.coverageDays, "p80");
  const history = forecast.history_stats || {};
  const recent = forecast.recent_stats || {};
  const recentDays = Math.max(0, Number(recent.days) || 0);
  const recentUnits = Math.max(0, Number(recent.units) || 0);
  const recentAvgDaily = recentDays > 0 ? recentUnits / recentDays : 0;
  const historyAvgDaily = Math.max(0, Number(history.mean) || mean(future.map((row) => row.p50)));
  const avgDaily = recentDays > 0 ? recentAvgDaily : historyAvgDaily;
  const dailyStd = Math.max(Number(history.std) || 0, avgDaily * 0.15);
  const safetyStock = zScore(options.serviceLevel) * dailyStd * Math.sqrt(Math.max(maxLead, 1));
  const targetStock = expectedDemand + safetyStock;
  const currentStock = Math.max(0, Number(forecast.current_stock) || 0);
  const shortfall = Math.max(0, targetStock - currentStock);
  const suggestedQty = Math.ceil(shortfall);
  const unitCost = Math.max(0, Number(forecast.cost) || 0);
  const listPrice = Math.max(0, Number(forecast.list_price) || 0);
  const fallbackPrice = Math.max(0, Number(forecast.lowest_price) || 0);
  const unitPrice = listPrice || fallbackPrice || unitCost * 1.3;
  const unitMargin = Math.max(0, unitPrice - unitCost);
  const spend = suggestedQty * unitCost;
  const opportunityCost = shortfall * unitMargin;
  const expectedProfitIfFullyFunded = Math.min(suggestedQty, shortfall) * unitMargin;
  const overstockUnits = Math.max(0, currentStock + suggestedQty - p80Demand);
  const capitalTiedRisk = overstockUnits * unitCost;
  const stockoutRisk = p80Demand > 0 ? clamp((p80Demand - currentStock) / p80Demand, 0, 1) : 0;
  const stockoutRiskAfter = p80Demand > 0
    ? clamp((p80Demand - currentStock - suggestedQty) / p80Demand, 0, 1)
    : 0;
  const daysOfSupply = avgDaily > 0 ? currentStock / avgDaily : 999;
  const soonDays = Math.max(1, Number(options.soonDays) || maxLead);
  const stockUrgency = avgDaily <= 0
    ? "no_demand"
    : currentStock <= 0
      ? "out_of_stock"
      : daysOfSupply <= soonDays
        ? "running_out_soon"
        : "healthy";
  const urgencyScore = stockUrgency === "out_of_stock"
    ? 1
    : stockUrgency === "running_out_soon"
      ? clamp(1 - daysOfSupply / soonDays, 0, 1)
      : 0;
  const recentNonzeroRatio = clamp(
    Number(recent.nonzero_ratio ?? history.nonzero_ratio) || 0,
    0,
    1
  );
  const recentGrowthRaw = Number(recent.growth);
  const recentGrowth = Number.isFinite(recentGrowthRaw) ? recentGrowthRaw : 0;
  const forecastWindow = Math.min(60, future.length);
  const forecastDemand = sumFuture(future, 0, forecastWindow, "p50");
  const forecastAvgDaily = forecastWindow > 0 ? forecastDemand / forecastWindow : avgDaily;
  const forecastGrowth = avgDaily > 0 ? forecastAvgDaily / avgDaily - 1 : 0;
  const supplyScore = clamp(1 - daysOfSupply / 120, 0, 1);
  const growthScore = clamp(0.5 + recentGrowth, 0, 1);
  const turnoverScore = clamp(
    supplyScore * 0.5 + recentNonzeroRatio * 0.3 + growthScore * 0.2,
    0,
    1
  );
  const riskPenaltyPerUnit = options.riskAversion * (1 - turnoverScore) * unitCost;
  const adjustedMargin = Math.max(0, unitMargin - riskPenaltyPerUnit);
  const efficiency = adjustedMargin / Math.max(unitCost, 0.01);
  const forecastCoverageDays = forecastAvgDaily > 0 ? currentStock / forecastAvgDaily : 999;
  const forecastCoverageScore = clamp(1 - forecastCoverageDays / 60, 0, 1);
  const projectedShortfallScore = clamp(shortfall / Math.max(forecastDemand, 1), 0, 1);
  const forecastGrowthScore = clamp(0.5 + forecastGrowth, 0, 1);
  const forecastScore = clamp(
    stockoutRisk * 0.4 +
      forecastCoverageScore * 0.3 +
      projectedShortfallScore * 0.2 +
      forecastGrowthScore * 0.1,
    0,
    1
  );
  const recentScore = turnoverScore;
  const recentProfit = Math.max(0, Number(recent.profit) || 0);
  const profitReference = Math.max(0, Number(options.profitReference) || 0);
  const profitabilityScore = profitReference > 0
    ? clamp(recentProfit / (recentProfit + profitReference), 0, 1)
    : 0;
  const priorityScore =
    100 *
    (forecastScore * 0.5 +
      recentScore * 0.25 +
      profitabilityScore * 0.15 +
      urgencyScore * 0.1);
  const recentTurnoverRatio = recentAvgDaily > 0
    ? recentUnits / Math.max(currentStock, 1)
    : 0;

  return {
    sku_id: forecast.sku_id,
    branch_id: forecast.branch_id,
    name: forecast.name,
    supplier_id: forecast.supplier_id,
    supplier_name: forecast.supplier_name,
    lead_time_min_days: minLead,
    lead_time_max_days: maxLead,
    expected_lead_time_days: expectedLead,
    expected_demand: Number(expectedDemand.toFixed(2)),
    lead_time_demand: Number(leadDemand.toFixed(2)),
    coverage_demand: Number(coverageDemand.toFixed(2)),
    p80_demand: Number(p80Demand.toFixed(2)),
    safety_stock: Number(safetyStock.toFixed(2)),
    current_stock: currentStock,
    target_stock: Number(targetStock.toFixed(2)),
    shortfall_units: Number(shortfall.toFixed(2)),
    suggested_order_qty: suggestedQty,
    unit_cost: Number(unitCost.toFixed(2)),
    unit_price: Number(unitPrice.toFixed(2)),
    unit_margin: Number(unitMargin.toFixed(2)),
    margin_ratio: unitCost > 0 ? Number((unitMargin / unitCost).toFixed(4)) : 0,
    required_spend: Number(spend.toFixed(2)),
    expected_profit_if_fully_funded: Number(expectedProfitIfFullyFunded.toFixed(2)),
    expected_profit_gain: 0,
    opportunity_cost: Number(opportunityCost.toFixed(2)),
    capital_tied_risk: Number(capitalTiedRisk.toFixed(2)),
    overstock_units: Number(overstockUnits.toFixed(2)),
    stockout_risk: Number(stockoutRisk.toFixed(4)),
    stockout_risk_after_order: Number(stockoutRiskAfter.toFixed(4)),
    days_of_supply: Number(Math.min(daysOfSupply, 999).toFixed(2)),
    days_until_stockout: avgDaily > 0 ? Number(Math.min(daysOfSupply, 999).toFixed(2)) : null,
    soon_days: soonDays,
    stock_urgency: stockUrgency,
    urgency_score: Number((urgencyScore * 100).toFixed(2)),
    turnover_score: Number(turnoverScore.toFixed(4)),
    risk_adjusted_margin: Number(adjustedMargin.toFixed(2)),
    capital_efficiency: Number(efficiency.toFixed(4)),
    priority_score: Number(priorityScore.toFixed(2)),
    forecast_score: Number((forecastScore * 100).toFixed(2)),
    recent_score: Number((recentScore * 100).toFixed(2)),
    profitability_score: Number((profitabilityScore * 100).toFixed(2)),
    recent_days: recentDays,
    recent_units: Number(recentUnits.toFixed(2)),
    recent_avg_daily: Number(recentAvgDaily.toFixed(4)),
    recent_revenue: Number((Number(recent.revenue) || 0).toFixed(2)),
    recent_profit: Number((Number(recent.profit) || 0).toFixed(2)),
    recent_margin_ratio: Number((Number(recent.margin_ratio) || 0).toFixed(4)),
    recent_nonzero_ratio: Number(recentNonzeroRatio.toFixed(4)),
    recent_growth: Number(recentGrowth.toFixed(4)),
    recent_stockout_rate: Number((Number(recent.stockout_rate) || 0).toFixed(4)),
    recent_turnover_ratio: Number(recentTurnoverRatio.toFixed(4)),
    forecast_avg_daily: Number(forecastAvgDaily.toFixed(4)),
    forecast_growth: Number(forecastGrowth.toFixed(4)),
    allocated_qty: 0,
    allocated_spend: 0,
    funded: false,
    allocation_reason: suggestedQty > 0 ? "pending" : "no_shortfall",
    model: forecast.model,
    is_intermittent: Boolean(forecast.is_intermittent),
  };
}

function allocate(items, options) {
  let remainingBudget = options.budget;
  const sorted = [...items].sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    if (b.recent_profit !== a.recent_profit) return b.recent_profit - a.recent_profit;
    return b.capital_efficiency - a.capital_efficiency;
  });

  for (const item of sorted) {
    if (item.suggested_order_qty <= 0) {
      item.allocation_reason = "no_shortfall";
      continue;
    }
    if (item.unit_cost <= 0) {
      item.allocated_qty = item.suggested_order_qty;
      item.allocated_spend = 0;
      item.expected_profit_gain = item.expected_profit_if_fully_funded;
      item.funded = true;
      item.allocation_reason = "zero_cost";
      continue;
    }
    const affordable = Math.floor(remainingBudget / item.unit_cost);
    const quantity = Math.min(item.suggested_order_qty, affordable);
    if (quantity <= 0) {
      item.allocation_reason = "budget_exhausted";
      continue;
    }
    item.allocated_qty = quantity;
    item.allocated_spend = Number((quantity * item.unit_cost).toFixed(2));
    item.expected_profit_gain = Number(
      (Math.min(quantity, item.shortfall_units) * item.unit_margin).toFixed(2)
    );
    item.funded = true;
    item.allocation_reason = quantity < item.suggested_order_qty ? "partial_budget" : "fully_funded";
    remainingBudget = Math.max(0, remainingBudget - item.allocated_spend);
  }

  return sorted;
}

function buildRestockPlan(forecasts, options = {}) {
  const config = normalizeOptions(options);
  const itemOptions = { ...config, profitReference: resolveProfitReference(forecasts) };
  const items = forecasts.map((forecast) => buildItem(forecast, itemOptions));
  const allocated = allocate(items, config);
  let priorityRank = 0;
  for (const item of allocated) {
    if (item.suggested_order_qty > 0) {
      priorityRank += 1;
      item.priority_rank = priorityRank;
    } else {
      item.priority_rank = null;
    }
  }
  const funded = allocated.filter((item) => item.funded);
  const allocatedSpend = funded.reduce((sum, item) => sum + item.allocated_spend, 0);
  const expectedProfit = funded.reduce((sum, item) => sum + item.expected_profit_gain, 0);
  const totalOpportunityCost = items.reduce((sum, item) => sum + item.opportunity_cost, 0);
  const totalCapitalRisk = items.reduce((sum, item) => sum + item.capital_tied_risk, 0);
  const totalShortfall = items.reduce((sum, item) => sum + item.shortfall_units, 0);
  const recommended = items.filter((item) => item.suggested_order_qty > 0);
  const soonToRunOut = recommended
    .filter((item) => item.stock_urgency === "running_out_soon")
    .sort((left, right) => {
      const leftDays = left.days_until_stockout ?? Number.POSITIVE_INFINITY;
      const rightDays = right.days_until_stockout ?? Number.POSITIVE_INFINITY;
      if (leftDays !== rightDays) return leftDays - rightDays;
      return right.recent_avg_daily - left.recent_avg_daily;
    });

  return {
    method: "greedy_recent_performance_forecast_risk_adjusted_capital_efficiency",
    parameters: {
      budget: config.budget,
      lead_time_min: config.leadTimeMin,
      lead_time_max: config.leadTimeMax,
      coverage_days: config.coverageDays,
      service_level: config.serviceLevel,
      risk_aversion: config.riskAversion,
      soon_days: config.soonDays,
      recent_window_days: 90,
    },
    summary: {
      budget: config.budget,
      allocated_spend: Number(allocatedSpend.toFixed(2)),
      remaining_budget: Number(Math.max(0, config.budget - allocatedSpend).toFixed(2)),
      budget_utilization: config.budget > 0 ? Number((allocatedSpend / config.budget).toFixed(4)) : 0,
      expected_profit_protected: Number(expectedProfit.toFixed(2)),
      expected_return_on_spend: allocatedSpend > 0 ? Number((expectedProfit / allocatedSpend).toFixed(4)) : 0,
      items_evaluated: items.length,
      items_recommended: recommended.length,
      items_funded: funded.length,
      items_unfunded: recommended.filter((item) => !item.funded).length,
      items_out_of_stock: recommended.filter((item) => item.stock_urgency === "out_of_stock").length,
      items_running_out_soon: soonToRunOut.length,
      items_healthy: recommended.filter((item) => item.stock_urgency === "healthy").length,
      total_shortfall_units: Number(totalShortfall.toFixed(2)),
      total_opportunity_cost: Number(totalOpportunityCost.toFixed(2)),
      total_capital_tied_risk: Number(totalCapitalRisk.toFixed(2)),
    },
    items: allocated,
    soon_to_run_out: soonToRunOut,
  };
}

function buildRiskBreakdown(forecasts, options = {}) {
  const config = normalizeOptions(options);
  const itemOptions = { ...config, profitReference: resolveProfitReference(forecasts) };
  const items = forecasts.map((forecast) => buildItem(forecast, itemOptions));
  const lostProfit = [...items]
    .filter((item) => item.opportunity_cost > 0)
    .sort((a, b) => b.opportunity_cost - a.opportunity_cost);
  const capitalTied = [...items]
    .filter((item) => item.capital_tied_risk > 0)
    .sort((a, b) => b.capital_tied_risk - a.capital_tied_risk);
  const overOrder = [...items]
    .filter((item) => item.overstock_units > 0)
    .sort((a, b) => b.capital_tied_risk - a.capital_tied_risk);
  return {
    parameters: {
      lead_time_min: config.leadTimeMin,
      lead_time_max: config.leadTimeMax,
      coverage_days: config.coverageDays,
      service_level: config.serviceLevel,
      risk_aversion: config.riskAversion,
    },
    lost_profit_if_stocked_out: lostProfit,
    capital_tied_if_over_ordered: capitalTied,
    over_order_candidates: overOrder,
  };
}

module.exports = {
  buildRestockPlan,
  buildRiskBreakdown,
  consolidateForecastsBySku,
  filterDiscontinuedSkus,
  filterStaleSkus,
  normalizeOptions,
  profitBySku,
  resolveProfitReference,
  zScore,
};
