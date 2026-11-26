const { addDays, diffDays } = require("./calendar");

// Ventana de rotación por defecto: un producto se considera "de baja rotación"
// cuando su stock alcanza para más de `slowDays` días al ritmo de venta actual
// (o cuando no vendió nada en la ventana).
const DEFAULT_WINDOW_DAYS = 90;
const DEFAULT_SLOW_DAYS = 90;
// Tope para "días de stock": evita Infinity y mantiene la tabla legible.
const DAYS_OF_SUPPLY_CAP = 999;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateKey(value) {
  return String(value || "").slice(0, 10);
}

function round(value, digits) {
  return Number(toNumber(value).toFixed(digits));
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "si", "sí", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function isDiscontinued(product) {
  if (!product) return false;
  return (
    product.is_discontinued === true ||
    product.is_discontinued === "true" ||
    product.is_discontinued === 1 ||
    product.is_discontinued === "1"
  );
}

// Calcula el capital inmovilizado (stock × costo) y la rotación de cada SKU.
// No depende del modelo de forecasting ni del snapshot: sólo necesita ventas,
// stock y el catálogo, así que no queda limitado a los SKUs más rentables.
function buildSlowMovingReport(dataset = {}, options = {}) {
  const asOfDate = toDateKey(options.asOfDate);
  const windowDays = clamp(
    Math.round(toNumber(options.windowDays ?? options.window_days) || DEFAULT_WINDOW_DAYS),
    7,
    365
  );
  const slowDays = clamp(
    Math.round(toNumber(options.slowDays ?? options.slow_days) || DEFAULT_SLOW_DAYS),
    1,
    365
  );
  const onlySlow = parseBoolean(options.onlySlow ?? options.only_slow, true);
  const skuFilter = options.skuId ?? options.sku_id;
  const requestedSku = skuFilter === null || skuFilter === undefined || skuFilter === ""
    ? null
    : Number(skuFilter);

  const stockBySku = new Map();
  for (const row of dataset.stock || []) {
    const sku = Number(row.sku_id);
    if (!Number.isFinite(sku)) continue;
    stockBySku.set(sku, (stockBySku.get(sku) || 0) + toNumber(row.stock));
  }

  const recentFrom = asOfDate ? addDays(asOfDate, -(windowDays - 1)) : null;
  const salesBySku = new Map();
  for (const row of dataset.sales || []) {
    const date = toDateKey(row.date);
    if (!date || (asOfDate && date > asOfDate)) continue;
    const sku = Number(row.sku_id);
    if (!Number.isFinite(sku)) continue;
    let entry = salesBySku.get(sku);
    if (!entry) {
      entry = { units: 0, revenue: 0, profit: 0, days: new Set(), lastSale: null };
      salesBySku.set(sku, entry);
    }
    const units = toNumber(row.units);
    if (units > 0 && (!entry.lastSale || date > entry.lastSale)) {
      entry.lastSale = date;
    }
    if (recentFrom && date >= recentFrom) {
      entry.units += units;
      entry.revenue += toNumber(row.revenue);
      entry.profit += toNumber(row.profit);
      if (units > 0) entry.days.add(date);
    }
  }

  const productBySku = new Map(
    (dataset.products || []).map((product) => [Number(product.id_product), product])
  );
  const supplierById = new Map(
    (dataset.suppliers || []).map((supplier) => [Number(supplier.id_supplier), supplier])
  );

  const items = [];
  for (const [sku, rawStock] of stockBySku.entries()) {
    if (requestedSku !== null && sku !== requestedSku) continue;
    const currentStock = Math.max(0, rawStock);
    if (currentStock <= 0) continue;

    const product = productBySku.get(sku);
    const cost = Math.max(0, toNumber(product?.cost));
    const capital = currentStock * cost;
    // Un producto sin costo conocido no permite medir capital dormido.
    if (capital <= 0) continue;

    const supplier = supplierById.get(Number(product?.fk_supplier));
    const recent = salesBySku.get(sku) || {
      units: 0,
      revenue: 0,
      profit: 0,
      days: new Set(),
      lastSale: null,
    };
    const recentUnits = Math.max(0, recent.units);
    const avgDailySales = recentUnits / windowDays;
    const daysOfSupplyRaw = avgDailySales > 0
      ? currentStock / avgDailySales
      : DAYS_OF_SUPPLY_CAP;
    const daysOfSupply = Math.min(daysOfSupplyRaw, DAYS_OF_SUPPLY_CAP);
    // Rotación de la ventana: fracción del stock que se vendió en `windowDays`.
    const rotationScore = currentStock > 0 ? recentUnits / currentStock : 0;
    const annualTurns = currentStock > 0
      ? (recentUnits * (365 / windowDays)) / currentStock
      : 0;
    const nonzeroRatio = recent.days.size / windowDays;
    const lastSaleDate = recent.lastSale;
    const daysSinceLastSale = lastSaleDate && asOfDate
      ? diffDays(lastSaleDate, asOfDate)
      : null;
    const isSlowMoving = recentUnits <= 0 || daysOfSupplyRaw > slowDays;

    items.push({
      sku_id: sku,
      branch_id: null,
      name: product?.name || `SKU ${sku}`,
      category_id: Number(product?.fk_category) || null,
      supplier_id: Number(product?.fk_supplier) || null,
      supplier_name: supplier?.name || null,
      cost: round(cost, 2),
      list_price: round(toNumber(product?.list_price), 2),
      lowest_price: round(toNumber(product?.lowest_price), 2),
      current_stock: round(currentStock, 2),
      capital_inmovilizado: round(capital, 2),
      recent_units_90d: round(recentUnits, 2),
      recent_revenue_90d: round(recent.revenue, 2),
      recent_profit_90d: round(recent.profit, 2),
      recent_days_with_sales: recent.days.size,
      avg_daily_sales: round(avgDailySales, 4),
      days_of_supply: round(daysOfSupply, 2),
      days_of_supply_raw: round(daysOfSupplyRaw, 2),
      rotation_score: round(rotationScore, 4),
      annual_turns: round(annualTurns, 2),
      last_sale_date: lastSaleDate,
      days_since_last_sale: daysSinceLastSale,
      is_slow_moving: isSlowMoving,
      is_discontinued: isDiscontinued(product),
      nonzero_ratio: round(nonzeroRatio, 4),
      is_intermittent: recentUnits <= 0 || nonzeroRatio < 0.35,
      has_sales_90d: recentUnits > 0,
      window_days: windowDays,
      slow_days: slowDays,
    });
  }

  const filtered = onlySlow ? items.filter((item) => item.is_slow_moving) : items;
  // Lo primero es el dinero dormido: capital inmovilizado descendente.
  // A igual capital, primero el que tarda más en venderse.
  filtered.sort((left, right) => {
    if (right.capital_inmovilizado !== left.capital_inmovilizado) {
      return right.capital_inmovilizado - left.capital_inmovilizado;
    }
    if (right.days_of_supply !== left.days_of_supply) {
      return right.days_of_supply - left.days_of_supply;
    }
    return left.rotation_score - right.rotation_score;
  });
  filtered.forEach((item, index) => {
    item.rank = index + 1;
  });

  const sumBy = (rows, field) =>
    rows.reduce((total, row) => total + toNumber(row[field]), 0);
  const withSales = filtered.filter((item) => item.avg_daily_sales > 0);

  return {
    parameters: {
      window_days: windowDays,
      recent_window_days: windowDays,
      slow_days: slowDays,
      only_slow: onlySlow,
      sort: "capital_inmovilizado_desc",
    },
    summary: {
      total_items: filtered.length,
      total_items_with_stock: items.length,
      slow_items: items.filter((item) => item.is_slow_moving).length,
      total_capital_inmovilizado: round(sumBy(filtered, "capital_inmovilizado"), 2),
      total_capital_with_stock: round(sumBy(items, "capital_inmovilizado"), 2),
      total_stock_units: round(sumBy(filtered, "current_stock"), 2),
      items_with_zero_sales_90d: filtered.filter((item) => !item.has_sales_90d).length,
      avg_days_of_supply: withSales.length
        ? round(sumBy(withSales, "days_of_supply") / withSales.length, 2)
        : 0,
    },
    items: filtered,
  };
}

module.exports = {
  buildSlowMovingReport,
  DEFAULT_SLOW_DAYS,
  DEFAULT_WINDOW_DAYS,
};
