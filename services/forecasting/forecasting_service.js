const moment = require("moment-timezone");
const { addDays, calendarFeatures } = require("./calendar");
const { trainAndForecast } = require("./demand_forecaster");
const { buildSeriesCollection } = require("./features");
const { ForecastingRepository } = require("./forecasting_repository");
const { loadModels } = require("./model_store");
const {
  buildRestockPlan,
  buildRiskBreakdown,
  consolidateForecastsBySku,
  filterDiscontinuedSkus,
  filterStaleSkus,
  normalizeOptions,
} = require("./restock_optimizer");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function todayInLima() {
  return moment().tz("America/Lima").format("YYYY-MM-DD");
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeCommonParams(params = {}) {
  const asOfDate = params.asOfDate || params.as_of_date || todayInLima();
  if (!DATE_PATTERN.test(asOfDate)) throw httpError(400, "as_of_date debe tener formato YYYY-MM-DD");
  const historyDays = clamp(Number(params.historyDays ?? params.history_days ?? 730) || 730, 60, 1095);
  const from = params.from || addDays(asOfDate, -(historyDays - 1));
  if (!DATE_PATTERN.test(from)) throw httpError(400, "from debe tener formato YYYY-MM-DD");
  const parseId = (value, name) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) throw httpError(400, `${name} debe ser un entero positivo`);
    return parsed;
  };
  const branchId = parseId(params.branchId ?? params.branch_id, "branch_id");
  const skuId = parseId(params.skuId ?? params.sku_id, "sku_id");
  const horizon = clamp(Number(params.horizon) || 28, 1, 120);
  const granularity = params.granularity === "week" ? "week" : "day";
  const parseOptionalDays = (value, name) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw httpError(400, `${name} debe ser un número mayor o igual a 0`);
    }
    return parsed;
  };
  const leadTimeMin = parseOptionalDays(params.leadTimeMin ?? params.lead_time_min, "lead_time_min");
  const leadTimeMax = parseOptionalDays(params.leadTimeMax ?? params.lead_time_max, "lead_time_max");
  if (leadTimeMin !== null && leadTimeMax !== null && leadTimeMax < leadTimeMin) {
    throw httpError(400, "lead_time_max debe ser mayor o igual a lead_time_min");
  }
  const forecastFrom = params.forecastFrom || params.forecast_from || params.date_from || null;
  const forecastTo = params.forecastTo || params.forecast_to || params.date_to || null;
  if (forecastFrom && !DATE_PATTERN.test(forecastFrom)) throw httpError(400, "forecast_from debe tener formato YYYY-MM-DD");
  if (forecastTo && !DATE_PATTERN.test(forecastTo)) throw httpError(400, "forecast_to debe tener formato YYYY-MM-DD");
  return {
    asOfDate,
    from,
    to: asOfDate,
    forecastFrom,
    forecastTo,
    historyDays,
    branchId,
    skuId,
    horizon,
    granularity,
    leadTimeMin,
    leadTimeMax,
    testDays: clamp(Number(params.testDays ?? params.test_days ?? 28) || 28, 7, 90),
    warmupDays: clamp(Number(params.warmupDays ?? params.warmup_days ?? 28) || 28, 7, 60),
    model: params.model || {},
    calendar: params.calendar || {},
    refresh: Boolean(params.refresh),
  };
}

function aggregateWeekly(future) {
  const groups = new Map();
  for (const row of future) {
    const calendar = calendarFeatures(row.date);
    const key = `${calendar.year}-W${String(calendar.week_of_year).padStart(2, "0")}`;
    if (!groups.has(key)) {
      groups.set(key, {
        date: row.date,
        week: calendar.week_of_year,
        year: calendar.year,
        p50: 0,
        p80: 0,
        baseline_p50: 0,
        baseline_p80: 0,
        calendar: row.calendar,
        projected_stock: row.projected_stock,
        projected_stockout: row.projected_stockout,
      });
    }
    const group = groups.get(key);
    group.p50 += row.p50;
    group.p80 += row.p80;
    group.baseline_p50 += row.baseline_p50;
    group.baseline_p80 += row.baseline_p80;
    group.projected_stock = row.projected_stock;
    group.projected_stockout = row.projected_stockout;
  }
  return [...groups.values()].map((group) => ({
    ...group,
    p50: Number(group.p50.toFixed(2)),
    p80: Number(group.p80.toFixed(2)),
    baseline_p50: Number(group.baseline_p50.toFixed(2)),
    baseline_p80: Number(group.baseline_p80.toFixed(2)),
  }));
}

class ForecastingService {
  constructor(options = {}) {
    this.repository = options.repository || new ForecastingRepository();
    this.cacheTtlMs = Number(options.cacheTtlMs) || 30 * 60 * 1000;
    this.cache = new Map();
    // `loadPretrained: null` desactiva el artefacto (tests / entrenamiento forzado).
    this.loadPretrained = options.loadPretrained === undefined ? loadModels : options.loadPretrained;
  }

  async getDemandForecasts(params = {}) {
    const common = normalizeCommonParams(params);
    const loadCommon = { ...common, branchId: null };
    const bundle = await this._getBundle(loadCommon);
    const selected = consolidateForecastsBySku(bundle.result.forecasts, {
      branchId: common.branchId,
    }).filter(
      (forecast) => common.skuId === null || forecast.sku_id === common.skuId
    );
    const forecasts = selected.map((forecast) => {
      const filteredFuture = forecast.future.filter((row) => {
        if (common.forecastFrom && row.date < common.forecastFrom) return false;
        if (common.forecastTo && row.date > common.forecastTo) return false;
        return true;
      });
      const future = common.granularity === "week" ? aggregateWeekly(filteredFuture) : filteredFuture;
      return {
        sku_id: forecast.sku_id,
        branch_id: forecast.branch_id,
        name: forecast.name,
        category_id: forecast.category_id,
        supplier_id: forecast.supplier_id,
        supplier_name: forecast.supplier_name,
        cost: forecast.cost,
        list_price: forecast.list_price,
        lowest_price: forecast.lowest_price,
        lead_time_min_days: forecast.lead_time_min_days,
        lead_time_max_days: forecast.lead_time_max_days,
        current_stock: forecast.current_stock,
        has_stock: forecast.has_stock,
        history_stats: forecast.history_stats,
        recent_stats: forecast.recent_stats,
        seasonality: forecast.seasonality,
        yoy_growth: forecast.yoy_growth,
        is_intermittent: forecast.is_intermittent,
        model: forecast.model,
        stockout_uplift: forecast.stockout_uplift,
        test_metrics: forecast.test_metrics,
        future,
      };
    });

    return {
      generated_at: new Date().toISOString(),
      consolidation: {
        by: "sku",
        stock_scope: "all_branches",
        demand_scope: common.branchId ? "selected_branch" : "all_branches",
        requested_branch_id: common.branchId,
      },
      filters: {
        branch_id: common.branchId,
        sku_id: common.skuId,
        from: common.from,
        to: common.to,
        forecast_from: common.forecastFrom,
        forecast_to: common.forecastTo,
        horizon: common.horizon,
        granularity: common.granularity,
        lead_time_min: common.leadTimeMin,
        lead_time_max: common.leadTimeMax,
      },
      metrics: bundle.result.metrics,
      meta: bundle.result.meta,
      forecasts,
    };
  }

  async getRestockPlan(params = {}) {
    const common = normalizeCommonParams(params);
    const options = normalizeOptions({
      budget: params.budget,
      leadTimeMin: common.leadTimeMin ?? undefined,
      leadTimeMax: common.leadTimeMax ?? common.leadTimeMin ?? undefined,
      coverageDays: params.coverageDays ?? params.coverage_days,
      serviceLevel: params.serviceLevel ?? params.service_level,
      riskAversion: params.riskAversion ?? params.risk_aversion,
      soonDays: params.soonDays ?? params.soon_days,
    });
    const restockCommon = { ...common, branchId: null };
    const dataset = await this._loadDataset(restockCommon);
    const maxLead = this._maxLeadTime(dataset, options);
    const horizon = Math.max(common.horizon, maxLead + options.coverageDays + 2);
    const bundle = await this._buildBundle(restockCommon, dataset, horizon);
    const consolidated = consolidateForecastsBySku(bundle.result.forecasts, {
      branchId: common.branchId,
    });
    const discontinued = filterDiscontinuedSkus(consolidated, dataset.products);
    const filtered = filterStaleSkus(discontinued.forecasts, dataset.sales, {
      asOfDate: common.asOfDate,
      staleDays: params.staleDays ?? params.stale_days,
      profitWindowDays: params.profitWindowDays ?? params.profit_window_days,
      topProfitCount: params.topProfitCount ?? params.top_profit_count,
    });
    const plan = buildRestockPlan(filtered.forecasts, options);
    return {
      generated_at: new Date().toISOString(),
      consolidation: {
        by: "sku",
        stock_scope: "all_branches",
        demand_scope: common.branchId ? "selected_branch" : "all_branches",
        requested_branch_id: common.branchId,
      },
      parameters: {
        ...plan.parameters,
        consolidated_by_sku: true,
        stock_scope: "all_branches",
        demand_scope: common.branchId ? "selected_branch" : "all_branches",
      },
      filter: {
        ...filtered.parameters,
        excluded_items: filtered.excluded.length,
        excluded: filtered.excluded,
        discontinued_items: discontinued.excluded.length,
        discontinued_skus: discontinued.discontinued_skus,
      },
      summary: plan.summary,
      items: plan.items,
      soon_to_run_out: plan.soon_to_run_out,
      forecast_metrics: bundle.result.metrics,
      meta: bundle.result.meta,
    };
  }

  async getRiskBreakdown(params = {}) {
    const common = normalizeCommonParams(params);
    const options = normalizeOptions({
      budget: params.budget,
      leadTimeMin: common.leadTimeMin ?? undefined,
      leadTimeMax: common.leadTimeMax ?? common.leadTimeMin ?? undefined,
      coverageDays: params.coverageDays ?? params.coverage_days,
      serviceLevel: params.serviceLevel ?? params.service_level,
      riskAversion: params.riskAversion ?? params.risk_aversion,
      soonDays: params.soonDays ?? params.soon_days,
    });
    const dataset = await this._loadDataset(common);
    const maxLead = this._maxLeadTime(dataset, options);
    const horizon = Math.max(common.horizon, maxLead + options.coverageDays + 2);
    const bundle = await this._buildBundle(common, dataset, horizon);
    const discontinued = filterDiscontinuedSkus(bundle.result.forecasts, dataset.products);
    const breakdown = buildRiskBreakdown(discontinued.forecasts, options);
    return {
      generated_at: new Date().toISOString(),
      parameters: {
        ...breakdown.parameters,
        discontinued_items: discontinued.excluded.length,
        discontinued_skus: discontinued.discontinued_skus,
      },
      lost_profit_if_stocked_out: breakdown.lost_profit_if_stocked_out,
      capital_tied_if_over_ordered: breakdown.capital_tied_if_over_ordered,
      over_order_candidates: breakdown.over_order_candidates,
      meta: bundle.result.meta,
    };
  }

  async _loadDataset(common) {
    return this.repository.loadDataset({
      branchId: common.branchId,
      skuId: common.skuId,
      from: common.from,
      to: common.to,
    });
  }

  _maxLeadTime(dataset, options) {
    let maxLead = Math.max(options.leadTimeMax, 7);
    for (const product of dataset.products || []) {
      maxLead = Math.max(maxLead, Number(product.lead_time_max_days) || 0);
    }
    for (const supplier of dataset.suppliers || []) {
      maxLead = Math.max(maxLead, Number(supplier.lead_time_max_days) || 0);
    }
    return maxLead;
  }

  async _getBundle(common) {
    const dataset = await this._loadDataset(common);
    return this._buildBundle(common, dataset, common.horizon);
  }

  async _buildBundle(common, dataset, horizon) {
    // Modelo preentrenado (patrón sofa): si existe el artefacto, sólo inferimos.
    // Si el request trae `model` explícito, respetamos el entrenamiento custom.
    const pretrained =
      this.loadPretrained && Object.keys(common.model || {}).length === 0 ? this.loadPretrained() : null;
    const modelSource = pretrained
      ? `pretrained:${pretrained.file || ""}:${pretrained.mtimeMs || ""}`
      : "trained";
    const cacheKey = JSON.stringify({
      branchId: common.branchId,
      skuId: common.skuId,
      from: common.from,
      to: common.to,
      horizon,
      leadTimeMin: common.leadTimeMin,
      leadTimeMax: common.leadTimeMax,
      testDays: common.testDays,
      warmupDays: common.warmupDays,
      model: common.model,
      calendar: common.calendar,
      modelSource,
    });
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now() && !common.refresh) return cached.bundle;

    const seriesList = buildSeriesCollection(dataset, {
      from: common.from,
      to: common.to,
      defaultLeadTimeMin: 4,
      defaultLeadTimeMax: 7,
      leadTimeMin: common.leadTimeMin,
      leadTimeMax: common.leadTimeMax,
      calendar: common.calendar,
    });
    const result = trainAndForecast(seriesList, {
      horizon,
      testDays: common.testDays,
      warmupDays: common.warmupDays,
      model: common.model,
      calendar: common.calendar,
      pretrained,
    });
    result.forecasts = result.forecasts.filter((forecast) => {
      if (common.branchId !== null && forecast.branch_id !== common.branchId) return false;
      if (common.skuId !== null && forecast.sku_id !== common.skuId) return false;
      return true;
    });
    const bundle = { dataset, seriesList, result };
    this.cache.set(cacheKey, { expires: Date.now() + this.cacheTtlMs, bundle });
    if (this.cache.size > 20) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    return bundle;
  }
}

module.exports = { ForecastingService, normalizeCommonParams };
