const moment = require("moment-timezone");
const { addDays, calendarFeatures } = require("./calendar");
const { trainAndForecast } = require("./demand_forecaster");
const { buildSeriesCollection } = require("./features");
const { ForecastingRepository } = require("./forecasting_repository");
const { loadModels, artifactStatus } = require("./model_store");
const { RestockSnapshotStore } = require("./restock_snapshot");
const { buildSlowMovingReport } = require("./slow_moving");
const {
  buildRestockPlan,
  buildRiskBreakdown,
  consolidateForecastsBySku,
  filterDiscontinuedSkus,
  filterStaleSkus,
  normalizeOptions,
  profitBySku,
} = require("./restock_optimizer");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Lead time fijo: evita combinaciones dinámicas y mantiene estable el snapshot.
const FIXED_LEAD_TIME_MIN = 4;
const FIXED_LEAD_TIME_MAX = 20;
const DEFAULT_HISTORY_DAYS = 365;
// Nunca se consultan más de 365 días de ventas: la ventana de un año es
// suficiente para estacionalidad y mantiene acotado el costo del escaneo.
const MAX_HISTORY_DAYS = 365;
// Ventana con la que se rankea la rentabilidad para recortar el snapshot.
const SNAPSHOT_PROFIT_WINDOW_DAYS = 365;

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
  const historyDays = clamp(
    Number(params.historyDays ?? params.history_days ?? DEFAULT_HISTORY_DAYS) || DEFAULT_HISTORY_DAYS,
    60,
    MAX_HISTORY_DAYS
  );
  const earliestFrom = addDays(asOfDate, -(MAX_HISTORY_DAYS - 1));
  const requestedFrom = params.from || addDays(asOfDate, -(historyDays - 1));
  const from = requestedFrom < earliestFrom ? earliestFrom : requestedFrom;
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
  // Lead time fijo para todo el cálculo: menos parámetros y snapshot estable.
  const leadTimeMin = FIXED_LEAD_TIME_MIN;
  const leadTimeMax = FIXED_LEAD_TIME_MAX;
  const forecastFrom = params.forecastFrom || params.forecast_from || params.date_from || null;
  const forecastTo = params.forecastTo || params.forecast_to || params.date_to || null;
  if (forecastFrom && !DATE_PATTERN.test(forecastFrom)) throw httpError(400, "forecast_from debe tener formato YYYY-MM-DD");
  if (forecastTo && !DATE_PATTERN.test(forecastTo)) throw httpError(400, "forecast_to debe tener formato YYYY-MM-DD");
  return {
    asOfDate,
    asOfExplicit: Boolean(params.asOfDate || params.as_of_date),
    from,
    fromExplicit: Boolean(params.from),
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
    // Deduplica cargas concurrentes del mismo dataset (single-flight).
    this.inflightDatasets = new Map();
    // `loadPretrained: null` desactiva el artefacto (tests / entrenamiento forzado).
    this.loadPretrained = options.loadPretrained === undefined ? loadModels : options.loadPretrained;
    this.snapshotCoverageMaxDays = Number(
      options.snapshotCoverageMaxDays || process.env.FORECASTING_SNAPSHOT_COVERAGE_DAYS || 180
    );
    // El costo del GBM es casi lineal en cantidad de series: el snapshot sólo
    // precalcula los SKUs que más aportan. `FORECASTING_SNAPSHOT_TOP_SKUS=0`
    // desactiva el recorte y vuelve a calcular todo el catálogo.
    const topSkus = Number(
      options.snapshotTopSkus ?? process.env.FORECASTING_SNAPSHOT_TOP_SKUS ?? 500
    );
    this.snapshotTopSkus = Number.isFinite(topSkus) && topSkus > 0 ? Math.floor(topSkus) : 0;

    // Un `refresh=true` repetido no debe volver a golpear Postgres.
    this.refreshCooldownMs = Number(
      options.refreshCooldownMs ||
        process.env.FORECASTING_REFRESH_COOLDOWN_MS ||
        15 * 60 * 1000
    );
    this.lastForcedRefreshAt = 0;
    // Un snapshot viejo se sigue sirviendo (stale-while-revalidate) mientras el
    // job diario corre; pasada esta ventana se prefiere recalcular.
    this.snapshotMaxAgeMs = Number(
      options.snapshotMaxAgeMs ||
        process.env.FORECASTING_SNAPSHOT_MAX_AGE_MS ||
        72 * 60 * 60 * 1000
    );
    this.snapshotStore = options.snapshotStore === null
      ? null
      : options.snapshotStore || new RestockSnapshotStore({
          refreshHour: options.refreshHour,
          refreshMinute: options.refreshMinute,
          jitterMinutes: options.jitterMinutes,
          persistPath: options.snapshotPath,
          persist: options.persistSnapshot,
        });
  }

  async getDemandForecasts(params = {}) {
    const common = normalizeCommonParams(params);
    const snapshot = this.snapshotStore ? this.snapshotStore.get() : null;
    const refreshRequested = common.refresh && this._canForceRefresh();
    if (common.refresh) common.refresh = refreshRequested;
    if (refreshRequested) this.lastForcedRefreshAt = Date.now();

    const snapshotReady =
      snapshot &&
      this._snapshotMatches(snapshot, common) &&
      common.horizon <= snapshot.horizon;

    if (refreshRequested && !snapshot && this.snapshotStore) {
      await this.snapshotStore.refresh().catch(() => {});
      const built = this.snapshotStore.get();
      if (built && this._snapshotMatches(built, common) && common.horizon <= built.horizon) {
        return this._demandResponseFromSnapshot(built, common, true);
      }
    }

    if (snapshotReady) {
      if (refreshRequested && this.snapshotStore) {
        this.snapshotStore.refresh().catch(() => {});
      }
      return this._demandResponseFromSnapshot(snapshot, common, refreshRequested);
    }

    const loadCommon = { ...common, branchId: null };
    const bundle = await this._getBundle(loadCommon);
    return this._demandResponse({
      common,
      source: bundle.result.forecasts,
      metrics: bundle.result.metrics,
      meta: bundle.result.meta,
      snapshotMeta: { served_from: "live" },
    });
  }

  _demandResponseFromSnapshot(snapshot, common, refreshRequested = false) {
    return this._demandResponse({
      common,
      source: snapshot.forecasts,
      metrics: snapshot.metrics,
      meta: snapshot.meta,
      snapshotMeta: {
        ...this._snapshotMeta(snapshot, "snapshot"),
        refresh_requested: Boolean(refreshRequested),
      },
    });
  }

  _demandResponse({ common, source, metrics, meta, snapshotMeta }) {
    const pool = common.skuId === null
      ? source
      : source.filter((forecast) => Number(forecast.sku_id) === common.skuId);
    const selected = consolidateForecastsBySku(pool, {
      branchId: common.branchId,
    }).filter(
      (forecast) => common.skuId === null || forecast.sku_id === common.skuId
    );
    const forecasts = selected.map((forecast) => {
      const horizonEnd = addDays(common.asOfDate, common.horizon);
      const filteredFuture = forecast.future.filter((row) => {
        if (row.date > horizonEnd) return false;
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
      metrics,
      meta,
      forecasts,
      snapshot: snapshotMeta,
    };
  }

  _snapshotMeta(snapshot, servedFrom) {
    return {
      served_from: servedFrom,
      as_of_date: snapshot.asOfDate,
      built_at: new Date(snapshot.builtAt).toISOString(),
      age_seconds: Math.round((Date.now() - snapshot.builtAt) / 1000),
      coverage_max_days: snapshot.coverageMaxDays,
      included_skus: snapshot.skuSelection ? snapshot.skuSelection.included_skus : null,
      refresh_in_progress: Boolean(this.snapshotStore && this.snapshotStore.isRefreshing()),
    };
  }

  // Sobrepone el flag `is_discontinued` vigente sobre los productos del
  // snapshot. Es una consulta mínima (id + flag, cache corto) y hace que
  // descontinuar/reactivar se refleje sin esperar al job diario.
  async _withFreshDiscontinuedFlags(products) {
    if (!Array.isArray(products) || products.length === 0) return products;
    if (typeof this.repository.loadDiscontinuedFlags !== "function") return products;
    try {
      const flags = await this.repository.loadDiscontinuedFlags();
      if (!Array.isArray(flags) || flags.length === 0) return products;
      const byId = new Map(
        flags.map((row) => [String(row.id_product), row.is_discontinued])
      );
      return products.map((product) => {
        const key = String(product.id_product);
        if (!byId.has(key)) return product;
        const value = byId.get(key);
        return {
          ...product,
          is_discontinued: value === true || value === "true" || value === 1,
        };
      });
    } catch (error) {
      // Si la consulta falla, se usan los flags del snapshot.
      return products;
    }
  }

  async getRestockPlan(params = {}) {
    const common = normalizeCommonParams(params);
    const options = this._restockOptions(params, common);
    const snapshot = this.snapshotStore ? this.snapshotStore.get() : null;
    const compatible = snapshot && this._isSnapshotCompatible(snapshot, common, options);

    // Cooldown del refresco manual: un botón pulsado varias veces (o varios
    // usuarios) no debe encadenar cálculos pesados.
    const refreshRequested = common.refresh && this._canForceRefresh();
    if (common.refresh) common.refresh = refreshRequested;
    if (refreshRequested) this.lastForcedRefreshAt = Date.now();

    // Cold start: no hay snapshot que servir, así que este request sí espera.
    if (refreshRequested && !snapshot && this.snapshotStore) {
      await this.snapshotStore.refresh().catch(() => {});
      const built = this.snapshotStore.get();
      if (built && this._isSnapshotCompatible(built, common, options)) {
        return this._restockResponseFromSnapshot(built, common, options, params, true);
      }
    }

    // Camino rápido: derivar el plan del snapshot precalculado. La derivación
    // es barata, así que cualquier presupuesto/cobertura/sucursal responde al
    // instante sin volver a consultar Postgres.
    if (compatible) {
      // Refresco manual: se dispara en segundo plano y se responde con el
      // snapshot vigente (stale-while-revalidate). Nunca calcula en el request.
      if (refreshRequested && this.snapshotStore) {
        this.snapshotStore.refresh().catch(() => {});
      }
      return this._restockResponseFromSnapshot(snapshot, common, options, params, refreshRequested);
    }

    const restockCommon = { ...common, branchId: null };
    const horizon = this._restockHorizon(common, options);
    const bundle = await this._getBundleFor(restockCommon, horizon);
    const dataset = bundle.dataset;
    const consolidated = consolidateForecastsBySku(bundle.result.forecasts, {
      branchId: common.branchId,
    });
    return this._assembleRestockResponse({
      common,
      options,
      params,
      consolidated,
      products: dataset.products,
      sales: dataset.sales,
      metrics: bundle.result.metrics,
      meta: bundle.result.meta,
      snapshotMeta: { served_from: "live" },
    });
  }

  _canForceRefresh(now = Date.now()) {
    return now - this.lastForcedRefreshAt >= this.refreshCooldownMs;
  }

  _restockOptions(params, common) {
    return normalizeOptions({
      budget: params.budget,
      leadTimeMin: common.leadTimeMin,
      leadTimeMax: common.leadTimeMax,
      coverageDays: params.coverageDays ?? params.coverage_days,
      serviceLevel: params.serviceLevel ?? params.service_level,
      riskAversion: params.riskAversion ?? params.risk_aversion,
      soonDays: params.soonDays ?? params.soon_days,
    });
  }

  _restockHorizon(common, options) {
    return Math.max(common.horizon, FIXED_LEAD_TIME_MAX + options.coverageDays + 2);
  }

  _isSnapshotCompatible(snapshot, common, options) {
    return (
      this._snapshotMatches(snapshot, common) &&
      options.coverageDays <= snapshot.coverageMaxDays &&
      options.leadTimeMin === snapshot.leadTimeMin &&
      options.leadTimeMax === snapshot.leadTimeMax
    );
  }

  _snapshotMatches(snapshot, common) {
    if (!snapshot) return false;
    if (snapshot.historyDays !== common.historyDays) return false;
    if (snapshot.leadTimeMin !== common.leadTimeMin) return false;
    if (snapshot.leadTimeMax !== common.leadTimeMax) return false;
    // El snapshot sólo cubre los SKUs más rentables: si piden uno de afuera,
    // conviene calcularlo en vivo (una sola serie es barata) antes que devolver
    // una lista vacía.
    if (
      common.skuId !== null &&
      !snapshot.forecasts.some((forecast) => Number(forecast.sku_id) === common.skuId)
    ) {
      return false;
    }
    // Si el cliente pidió una fecha explícita, el snapshot debe ser de esa fecha.
    if (common.asOfExplicit) return snapshot.asOfDate === common.asOfDate;
    if (common.fromExplicit && snapshot.from !== common.from) return false;
    // Stale-while-revalidate: mientras el job diario no corra, se sirve el
    // snapshot anterior dentro de la ventana permitida.
    return Date.now() - snapshot.builtAt <= this.snapshotMaxAgeMs;
  }

  _restockResponseFromSnapshot(snapshot, common, options, params, refreshRequested = false) {
    const forecasts = common.skuId === null
      ? snapshot.forecasts
      : snapshot.forecasts.filter((forecast) => Number(forecast.sku_id) === common.skuId);
    const consolidated = consolidateForecastsBySku(forecasts, {
      branchId: common.branchId,
    });
    return this._assembleRestockResponse({
      common,
      options,
      params,
      consolidated,
      products: snapshot.products,
      sales: snapshot.sales,
      metrics: snapshot.metrics,
      meta: snapshot.meta,
      snapshotMeta: {
        ...this._snapshotMeta(snapshot, "snapshot"),
        refresh_requested: Boolean(refreshRequested),
      },
    });
  }

  async _assembleRestockResponse({
    common,
    options,
    params,
    consolidated,
    products,
    sales,
    metrics,
    meta,
    snapshotMeta,
  }) {
    // El snapshot puede tener hasta un día de antigüedad; los flags de
    // descontinuado se refrescan aparte para que "no reponer" sea inmediato.
    const freshProducts = await this._withFreshDiscontinuedFlags(products);
    const discontinued = filterDiscontinuedSkus(consolidated, freshProducts);
    const filtered = filterStaleSkus(discontinued.forecasts, sales, {
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
      forecast_metrics: metrics,
      meta,
      snapshot: snapshotMeta,
    };
  }

  async buildRestockSnapshot(params = {}) {
    const started = Date.now();
    const common = normalizeCommonParams({
      asOfDate: params.asOfDate ?? params.as_of_date,
      historyDays: params.historyDays ?? params.history_days,
      refresh: true,
    });
    const restockCommon = { ...common, branchId: null, skuId: null };
    const rawDataset = await this.repository.loadDataset({
      branchId: null,
      skuId: null,
      from: common.from,
      to: common.to,
      sequential: true,
    });
    const { dataset, selection } = this._selectSnapshotSkus(rawDataset, common);
    const horizon = Math.max(
      common.horizon,
      FIXED_LEAD_TIME_MAX + this.snapshotCoverageMaxDays + 2
    );
    const bundle = await this._buildBundle(restockCommon, dataset, horizon);
    return {
      asOfDate: common.asOfDate,
      from: common.from,
      historyDays: common.historyDays,
      leadTimeMin: FIXED_LEAD_TIME_MIN,
      leadTimeMax: FIXED_LEAD_TIME_MAX,
      coverageMaxDays: this.snapshotCoverageMaxDays,
      skuSelection: selection,
      horizon,
      forecasts: bundle.result.forecasts,
      sales: dataset.sales,
      products: dataset.products,
      suppliers: dataset.suppliers,
      metrics: bundle.result.metrics,
      meta: bundle.result.meta,
      builtAt: Date.now(),
      durationMs: Date.now() - started,
    };
  }

  // Recorta el dataset del snapshot a los SKUs más rentables del último año.
  // El plan de reposición se arma sólo con ellos; el resto del catálogo queda
  // fuera porque el costo del cálculo es casi lineal en cantidad de series.
  _selectSnapshotSkus(dataset, common) {
    const limit = this.snapshotTopSkus;
    const profits = profitBySku(dataset.sales, {
      asOfDate: common.asOfDate,
      windowDays: SNAPSHOT_PROFIT_WINDOW_DAYS,
    });
    const total = profits.size;
    const selection = {
      limit: limit > 0 ? limit : null,
      profit_window_days: SNAPSHOT_PROFIT_WINDOW_DAYS,
      total_skus: total,
      included_skus: total,
      applied: false,
    };
    if (!limit || total <= limit) return { dataset, selection };

    const allowed = new Set(
      [...profits.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit)
        .map(([sku]) => sku)
    );
    const keepRows = (rows) => (rows || []).filter((row) => allowed.has(Number(row.sku_id)));
    selection.included_skus = allowed.size;
    selection.applied = true;
    return {
      dataset: {
        ...dataset,
        sales: keepRows(dataset.sales),
        entries: keepRows(dataset.entries),
        stock: keepRows(dataset.stock),
        products: (dataset.products || []).filter((product) =>
          allowed.has(Number(product.id_product))
        ),
      },
      selection,
    };
  }

  startRestockSnapshot() {
    if (!this.snapshotStore) return;
    this.snapshotStore.start(() => this.buildRestockSnapshot());
  }

  stopRestockSnapshot() {
    if (this.snapshotStore) this.snapshotStore.stop();
  }

  getRestockSnapshotStatus() {
    const status = this.snapshotStore
      ? this.snapshotStore.status()
      : { ready: false, refreshing: false, last_error: null };
    const snapshot = this.snapshotStore ? this.snapshotStore.get() : null;
    return {
      ...status,
      sku_selection: snapshot && snapshot.skuSelection ? snapshot.skuSelection : null,
      model_source: snapshot && snapshot.meta ? snapshot.meta.model_source || null : null,
      model: artifactStatus(),
      refresh_cooldown_seconds: Math.round(this.refreshCooldownMs / 1000),
      manual_refresh_allowed: this._canForceRefresh(),
      manual_refresh_available_at: this.lastForcedRefreshAt
        ? new Date(this.lastForcedRefreshAt + this.refreshCooldownMs).toISOString()
        : null,
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
    const snapshot = this.snapshotStore ? this.snapshotStore.get() : null;
    if (
      snapshot &&
      !common.refresh &&
      this._snapshotMatches(snapshot, common) &&
      common.horizon <= snapshot.horizon
    ) {
      return this._riskResponseFromSnapshot(snapshot, common, options);
    }
    const horizon = Math.max(common.horizon, FIXED_LEAD_TIME_MAX + options.coverageDays + 2);
    const bundle = await this._getBundleFor(common, horizon);
    return this._riskResponse({
      common,
      options,
      forecasts: bundle.result.forecasts,
      products: bundle.dataset.products,
      meta: bundle.result.meta,
    });
  }

  async getSlowMovingCapital(params = {}) {
    const common = normalizeCommonParams(params);
    // Este reporte no necesita el modelo de forecasting: sólo ventas, stock y
    // catálogo. Así incluye todo el catálogo (el snapshot se recorta a los SKUs
    // más rentables y dejaría afuera justamente a los de baja rotación).
    const historyFrom = addDays(common.asOfDate, -(MAX_HISTORY_DAYS - 1));
    const dataset = await this.repository.loadDataset({
      branchId: common.branchId,
      skuId: common.skuId,
      // Siempre un año de historia: permite ubicar la última venta y comparar
      // la rotación de 90 días incluso si el request pide menos historial.
      from: historyFrom,
      to: common.asOfDate,
    });
    const freshProducts = await this._withFreshDiscontinuedFlags(dataset.products);
    const report = buildSlowMovingReport(
      { ...dataset, products: freshProducts },
      {
        asOfDate: common.asOfDate,
        windowDays: params.windowDays ?? params.window_days,
        slowDays: params.slowDays ?? params.slow_days,
        onlySlow: params.onlySlow ?? params.only_slow,
        skuId: common.skuId,
      }
    );

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
        from: historyFrom,
        to: common.asOfDate,
        horizon: common.horizon,
        granularity: common.granularity,
        lead_time_min: common.leadTimeMin,
        lead_time_max: common.leadTimeMax,
        recent_window_days: report.parameters.window_days,
        slow_days: report.parameters.slow_days,
        only_slow: report.parameters.only_slow,
      },
      parameters: report.parameters,
      summary: report.summary,
      items: report.items,
      snapshot: { served_from: "live" },
    };
  }

  _riskResponseFromSnapshot(snapshot, common, options) {
    const forecasts = common.branchId === null
      ? snapshot.forecasts
      : snapshot.forecasts.filter(
          (forecast) => String(forecast.branch_id) === String(common.branchId)
        );
    return this._riskResponse({
      common,
      options,
      forecasts,
      products: snapshot.products,
      meta: snapshot.meta,
    });
  }

  async _riskResponse({ common, options, forecasts, products, meta }) {
    const freshProducts = await this._withFreshDiscontinuedFlags(products);
    const discontinued = filterDiscontinuedSkus(forecasts, freshProducts);
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
      meta,
    };
  }

  async _loadDataset(common, options = {}) {
    // Single-flight: si dos requests piden el mismo dataset a la vez, sólo uno
    // consulta Postgres y el otro espera el mismo resultado.
    const key = [
      common.branchId,
      common.skuId,
      common.from,
      common.to,
      Boolean(options.sequential),
    ].join("|");
    const pending = this.inflightDatasets.get(key);
    if (pending) return pending;

    const promise = this.repository
      .loadDataset({
        branchId: common.branchId,
        skuId: common.skuId,
        from: common.from,
        to: common.to,
        sequential: options.sequential,
      })
      .finally(() => this.inflightDatasets.delete(key));
    this.inflightDatasets.set(key, promise);
    return promise;
  }

  async _getBundle(common) {
    return this._getBundleFor(common, common.horizon);
  }

  // Revisa el cache ANTES de tocar Postgres: un cache hit no debe costar una
  // carga de dataset.
  async _getBundleFor(common, horizon) {
    const pretrained = this._pretrainedFor(common);
    const cacheKey = this._bundleCacheKey(common, horizon, pretrained);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now() && !common.refresh) return cached.bundle;
    const dataset = await this._loadDataset(common);
    return this._computeBundle(common, dataset, horizon, cacheKey, pretrained);
  }

  _pretrainedFor(common) {
    // Modelo preentrenado (patrón sofa): si existe el artefacto, sólo inferimos.
    // Si el request trae `model` explícito, respetamos el entrenamiento custom.
    return this.loadPretrained && Object.keys(common.model || {}).length === 0
      ? this.loadPretrained()
      : null;
  }

  _bundleCacheKey(common, horizon, pretrained) {
    const modelSource = pretrained
      ? `pretrained:${pretrained.file || ""}:${pretrained.mtimeMs || ""}`
      : "trained";
    return JSON.stringify({
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
  }

  async _buildBundle(common, dataset, horizon) {
    const pretrained = this._pretrainedFor(common);
    const cacheKey = this._bundleCacheKey(common, horizon, pretrained);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now() && !common.refresh) return cached.bundle;
    return this._computeBundle(common, dataset, horizon, cacheKey, pretrained);
  }

  _computeBundle(common, dataset, horizon, cacheKey, pretrained) {
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
