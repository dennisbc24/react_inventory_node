# Demand Forecasting & Budget-Constrained Restocking

This module adds SKU-level demand forecasting with branch-filtered demand and total stock across branches, plus a budget-constrained restocking simulator, to the existing Express/PostgreSQL backend. It uses the existing `sales`, `existence`, `entries`, `products`, `suppliers`, and `branches` tables. No ORM or external ML service is required.

## Architecture

```
services/forecasting/
  calendar.js                 holidays, pay cycles, ISO weeks, seasonality profiles
  metrics.js                  WAPE, MAPE, MAE, RMSE, pinball loss
  gbm.js                      dependency-free histogram gradient-boosted trees
  intermittent.js             Croston/TSB-style intermittent-demand fallback
  features.js                 series reconstruction, stockout flags, lag/rolling features
  demand_forecaster.js        time split, training, evaluation, recursive future forecasts
  restock_optimizer.js        safety stock, margins, risk scoring, greedy budget allocation
  restock_snapshot.js         daily snapshot store, scheduler, jitter and disk persistence
  forecasting_repository.js   PostgreSQL queries, catalog cache and schema adapters
  forecasting_service.js      public service functions and short-lived model cache
controllers/forecasting.controllers.js
routers/api/forecastingRouter.js
migrations/006_forecasting.sql
tests/forecasting.test.js
```

The GBM engine is a histogram-based gradient-boosted tree implementation with L2, quantile, Poisson, and Tweedie objectives. It is intentionally dependency-free so the Node service deploys without Python or native bindings. The model interface is isolated in `gbm.js`, so it can be replaced by a Python LightGBM/XGBoost worker later without changing the feature, evaluation, or restocking layers.

## Schema Mapping and Assumptions

| Requirement | Existing column / adapter |
|---|---|
| `branch_id` | `sales.fk_id_branch`, `existence.fk_branch` |
| `sku_id` | `sales.fk_product`, `existence.fk_product`, `products.id_product` |
| `cost_unit` | `products.cost` |
| `price_unit` | daily weighted `SUM(p_total) / SUM(amount)`, fallback `products.list_price` |
| `margin` | `price_unit - products.cost` |
| `lead_time_days` | fixed at 4-20 days for every SKU; supplier/product lead-time columns are kept for reference but are not used by the calculation |
| `stockout_flag` | derived: reconstructed daily stock reaches zero (no new column required) |
| current stock | `SUM(existence.amount)` per SKU across all branches for consolidated views |
| inbound stock | `entries.amount` joined through `existence` |

Historical stock is reconstructed backwards from current `existence` using daily sales and entries:

```
stock_end(t) = stock_end(t+1) + sales(t+1) - entries(t+1)
stock_start(t) = stock_end(t-1)
```

A day is flagged as a stockout when reconstructed stock start or end is zero or negative. Zero-sales stockout rows are excluded from GBM training to reduce censored-demand bias. Future forecasts receive a capped uplift based on the historical stockout rate.

The migration adds lead-time columns and forecasting indexes. It is safe to run on the existing database:

```
node migrations/run.js 006_forecasting.sql
```

## Branch Consolidation

Demand projections and restock plans are consolidated to one row per SKU:

- `current_stock` is always the sum of `existence.amount` across all branches.
- If `branch_id` is provided, projected demand and recent performance use only that branch, while stock remains total across all branches.
- If `branch_id` is omitted, projected demand, recent performance, and stock all use all branches.
- This prevents double-counting the same stock across multiple branch rows and matches how purchasing replenishes company-wide inventory.

## Models

- `p50`: quantile GBM at the 50th percentile.
- `p80`: quantile GBM at the 80th percentile.
- Intermittent SKUs (`nonzero_ratio < 0.35` or mean demand `< 0.5`) use TSB (Teunter-Syntetos-Babai) instead of the GBM.
- Baselines: seasonal naive (same weekday last week) and 7-day moving average.
- Time-based split: the last ~25% of history (up to 28 days) is held out. No random split is used.
- Metrics: WAPE, MAPE, MAE, RMSE, pinball loss for p50 and p80. Metrics are returned for the hybrid model, GBM, seasonal naive, and moving average.

Features include:

- lag 1/7/14/28, rolling mean 7/14/28, rolling std/max 7, days since last sale, nonzero ratio
- day of week, month, ISO week, day of year, weekend, month start/end
- Peru national holidays (including Easter-based holidays), pay cycle (15th and month-end), peak seasons (Fiestas Patrias, Christmas, Mother's/Father's Day windows)
- price, price lag, price ratio
- reconstructed stock start/end, stockout flag, lagged stockout flag
- category, supplier, SKU, branch identifiers
- year-over-year factor when 12+ months of history exist

## Restocking Optimizer

For each consolidated SKU (stock summed across all branches):

- expected demand = demand over expected lead time + demand over the coverage window
- safety stock = `z(service_level) * daily_std * sqrt(max_lead_time)`
- suggested order = `ceil(max(0, expected_demand + safety_stock - current_stock))`
- unit margin = `unit_price - unit_cost`
- opportunity cost = shortfall units x unit margin
- capital tied risk = expected overstock units x unit cost
- recent performance = last 90 days of units, revenue, estimated profit, margin, growth, stockout rate and turnover
- profitability score = absolute profit earned in the last 90 days, normalized with `profit / (profit + median_positive_profit)`
- capital efficiency = risk-adjusted unit margin / unit cost
- stock urgency: `out_of_stock` (no stock), `running_out_soon` (stock lasts at most `soon_days`, default = lead time max), `healthy` (more coverage), or `no_demand`
- urgency score = 1 for out-of-stock, `1 - days_of_supply / soon_days` for running-out-soon, 0 otherwise

The allocator is greedy and ranks SKUs with a weighted score:

- 50% projected demand: p80 stockout risk, forecast coverage days, projected shortfall and forecast growth
- 25% recent performance: last-90-day turnover, nonzero-sales ratio and growth
- 15% profitability: absolute money earned in the last 90 days, not the margin percentage over cost; this prevents a cheap high-margin item from outranking an item that earns more money in total
- 10% stock urgency: products with stock that will run out within the lead time are pulled ahead of items with more coverage

The response includes two views of the same calculation: `items` is the general restock search, and `soon_to_run_out` is the specific search for products that still have stock but will run out within `soon_days`, sorted by days until stockout and then recent turnover. Summary counts expose `items_out_of_stock`, `items_running_out_soon` and `items_healthy`.

Projections are therefore the main ranking factor; recent performance, profitability and urgency support the decision. The allocator funds affordable units until the budget is exhausted, supports partial funding, and reports why an item was not funded. The default budget is S/ 2,000, the lead time is fixed at 4-20 days, default coverage is 60 days (at least two months), and default `soon_days` equals the lead-time max (20 days).

## Service Functions

```js
const { ForecastingService } = require("../services/forecasting/forecasting_service");
const service = new ForecastingService();

await service.getDemandForecasts({ branch_id: 1, horizon: 28, granularity: "day" });
await service.getRestockPlan({ budget: 2000, coverage_days: 60 });
await service.getRiskBreakdown({ branch_id: 1, coverage_days: 60 });
```

For demand and restock, `branch_id` filters projected demand only. Stock is always consolidated across all branches. Omit `branch_id` to consolidate demand across all branches as well.

The lead time is fixed at 4-20 days for every SKU. `lead_time_min` / `lead_time_max` request parameters are accepted for backwards compatibility but ignored.

## API Examples

All endpoints require the existing JWT auth and accept the roles `admin`, `seller`, and `viewer`.

```http
GET /api/v1/forecasting/demand?branch_id=1&sku_id=25&horizon=28&granularity=day&lead_time_min=4&lead_time_max=7
GET /api/v1/forecasting/demand?branch_id=1&forecast_from=2026-11-20&forecast_to=2026-12-20&granularity=week
GET /api/v1/forecasting/restock?budget=2000&lead_time_min=4&lead_time_max=7&coverage_days=60&branch_id=1
POST /api/v1/forecasting/restock
GET /api/v1/forecasting/risk?branch_id=1&lead_time_min=4&lead_time_max=7&coverage_days=60
```

`POST /api/v1/forecasting/restock` body:

```json
{
  "budget": 2000,
  "lead_time_min": 4,
  "lead_time_max": 7,
  "coverage_days": 60,
  "branch_id": 1,
  "service_level": 0.8,
  "risk_aversion": 0.25
}
```

Example demand response (abridged):

```json
{
  "metrics": {
    "hybrid": { "wape": 0.18, "mape": 0.24, "pinball_p50": 0.7, "pinball_p80": 1.1 },
    "seasonal_naive": { "wape": 0.31, "mape": 0.4, "pinball_p50": 1.2, "pinball_p80": 1.8 }
  },
  "forecasts": [
    {
      "sku_id": 25,
      "branch_id": 1,
      "name": "Producto",
      "current_stock": 12,
      "lead_time_min_days": 4,
      "lead_time_max_days": 7,
      "is_intermittent": false,
      "model": "gbm-quantile",
      "seasonality": { "dow_factors": [0.8, 0.9, 1.0, 1.0, 1.1, 1.3, 1.2] },
      "future": [
        { "date": "2026-11-20", "p50": 5.2, "p80": 8.1, "projected_stock": 6.8 }
      ]
    }
  ]
}
```

Example restock response (abridged):

```json
{
  "summary": {
    "budget": 2000,
    "allocated_spend": 1980,
    "remaining_budget": 20,
    "expected_profit_protected": 760,
    "expected_return_on_spend": 0.38,
    "items_running_out_soon": 1
  },
  "items": [
    {
      "sku_id": 25,
      "priority_rank": 1,
      "suggested_order_qty": 120,
      "allocated_qty": 120,
      "required_spend": 1200,
      "expected_profit_gain": 480,
      "stockout_risk": 0.72,
      "stockout_risk_after_order": 0.1,
      "days_until_stockout": 6.5,
      "soon_days": 7,
      "stock_urgency": "running_out_soon",
      "urgency_score": 7.14,
      "forecast_score": 91.2,
      "recent_score": 68.4,
      "profitability_score": 52.1,
      "priority_score": 82.6,
      "recent_units": 240,
      "recent_avg_daily": 2.67,
      "recent_margin_ratio": 0.38,
      "capital_efficiency": 0.4,
      "allocation_reason": "fully_funded"
    }
  ],
  "soon_to_run_out": [
    {
      "sku_id": 25,
      "days_until_stockout": 6.5,
      "recent_avg_daily": 2.67,
      "stock_urgency": "running_out_soon"
    }
  ]
}
```

## Daily Snapshot and Database Load

The forecasting endpoints are designed to keep the heavy work off the request path:

- **One daily job.** `RestockSnapshotStore` rebuilds a single global snapshot once per day at **09:00 America/Lima** (configurable) with up to **15 minutes of jitter** so it does not collide with backups or other jobs. If the process restarts with a snapshot already built today, it is not recomputed. The scheduler starts automatically in production; in development it stays off unless `FORECASTING_SNAPSHOT_ENABLED=true`, because dev and prod share the same database.
- **Stale-while-revalidate.** Requests are derived from the in-memory snapshot, which is cheap. A snapshot from the previous day is still served (up to `FORECASTING_SNAPSHOT_MAX_AGE_MS`, default 72 h) until the next daily run finishes.
- **Single-flight.** Only one snapshot build can run at a time, and concurrent dataset loads with the same parameters share one Postgres query set.
- **Sequential background queries.** The daily job runs `sales`, `entries`, `stock`, and catalog queries one after another. Requests never run six parallel queries per cache miss.
- **One year of sales.** The history window defaults to **365 days** and is capped at 365, even if `history_days=730` is requested.
- **Top profitable SKUs only.** The snapshot precomputes just the **500 SKUs with the most absolute profit over the last 365 days** (`FORECASTING_SNAPSHOT_TOP_SKUS`, `0` disables the cut). The GBM cost is almost linear in the number of series, so this is the main lever on build time. SKUs outside the cut stay out of the restock plan, but a request for one specific SKU is computed live (a single series is cheap) instead of returning an empty list.
- **Long-lived catalog cache.** `products`, `suppliers`, and `branches` are cached for 12 h (`FORECASTING_CATALOG_TTL_MS`).
- **Persisted snapshot.** The snapshot is written to `services/forecasting/artifacts/restock_snapshot.json.gz` (gitignored, outside the tracked tree) so a restart or deploy does not trigger a cold start. Override with `FORECASTING_SNAPSHOT_PATH`, or disable with `FORECASTING_SNAPSHOT_PERSIST=false`.
- **Manual refresh with cooldown.** `refresh=true` triggers a background snapshot rebuild and responds with the current snapshot. Repeated calls within `FORECASTING_REFRESH_COOLDOWN_MS` (default 15 min) are ignored, and a manual refresh never computes inside the request unless there is no snapshot at all (cold start).
- **Discontinued products are immediate.** The snapshot keeps the heavy forecast data, but `is_discontinued` is refreshed separately with a short cache (`FORECASTING_DISCONTINUED_TTL_MS`, default 60 s) and invalidated by the product PATCH endpoint. Marking a product as "no reponer" (or re-enabling it) changes the restock and risk responses on the next request, without waiting for the daily rebuild or a restart.
- **Dedicated read-only pool.** `forecastingPool` uses `application_name=inventario-forecasting`, `max=2`, `connectionTimeoutMillis=10000`, `statement_timeout=120000`, and `default_transaction_read_only=on`. It is visible in `pg_stat_activity` and cannot write.

Operational status is exposed at `GET /api/v1/forecasting/restock/status`:

```json
{
  "ready": true,
  "refreshing": false,
  "as_of_date": "2026-11-22",
  "built_at": "2026-11-22T14:03:12.000Z",
  "age_seconds": 3600,
  "refresh_hour_lima": 9,
  "jitter_minutes": 15,
  "persisted": true,
  "refresh_cooldown_seconds": 900,
  "manual_refresh_allowed": true,
  "manual_refresh_available_at": null,
  "sku_selection": {
    "limit": 500,
    "profit_window_days": 365,
    "total_skus": 1834,
    "included_skus": 500,
    "applied": true
  },
  "model_source": "pretrained",
  "model": {
    "available": true,
    "file": ".../artifacts/gbm_quantiles.json",
    "age_seconds": 5400,
    "trained_at": "2026-11-22T10:00:00.000Z",
    "as_of_date": "2026-11-22",
    "error": null
  },
  "last_error": null
}
```

`model.available: false` means the GBM artifact is missing or invalid, so every calculation would train in hot mode and be far slower; the server logs a warning at startup and the deploy workflow aborts if the artifact is not generated.

Relevant environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `FORECASTING_SNAPSHOT_ENABLED` | production: `true`, development: `false` | Start the daily snapshot scheduler with the server; set to `true` in dev to test it |
| `FORECASTING_SNAPSHOT_HOUR` / `_MINUTE` | `9` / `0` | Daily run time in America/Lima |
| `FORECASTING_SNAPSHOT_JITTER_MINUTES` | `15` | Random delay added to the daily run |
| `FORECASTING_SNAPSHOT_COVERAGE_DAYS` | `180` | Days of coverage precomputed in the snapshot |
| `FORECASTING_SNAPSHOT_TOP_SKUS` | `500` | Only the N most profitable SKUs (last 365 days) are precomputed; `0` precomputes the whole catalog |
| `FORECASTING_SNAPSHOT_MAX_AGE_MS` | `259200000` | Max age of a snapshot served while stale |
| `FORECASTING_SNAPSHOT_PATH` | `artifacts/restock_snapshot.json.gz` | Persisted snapshot file |
| `FORECASTING_REFRESH_COOLDOWN_MS` | `900000` | Minimum interval between manual refreshes |
| `FORECASTING_CATALOG_TTL_MS` | `43200000` | Catalog cache TTL |
| `FORECASTING_DB_POOL_MAX` | `2` | Max connections in the forecasting pool |
| `FORECASTING_DB_STATEMENT_TIMEOUT_MS` | `120000` | Server-side statement timeout |

## Tests

```bash
cd backend
npm test
```

The tests use synthetic time series covering seasonality, holidays/pay cycles, intermittent demand, reconstructed stockouts, a 4-7 day lead time, p50/p80 forecasts, and a S/ 2,000 budget allocation. They also exercise the service end-to-end with an in-memory repository.

## Limitations

- Forecast quality depends on having enough history. With fewer than ~60 days, the module falls back to simple moving-average/TSB behavior.
- Current stock is a point-in-time snapshot; open purchase orders are not included because the current schema has no open-order quantity.
- Stockout reconstruction assumes `entries` and `sales` are complete for the selected history window.
- Models are cached in memory for 30 minutes per branch/SKU/date-range/horizon combination, and a cache hit does not re-query the dataset. `refresh=true` is subject to the manual-refresh cooldown.
- The GBM is dependency-free rather than the Python LightGBM package. The algorithm and feature/evaluation interfaces are compatible with a future LightGBM/XGBoost worker.
