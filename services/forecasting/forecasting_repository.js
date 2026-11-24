const { forecastingPool } = require("../../config/db");

// Catálogos pequeños que cambian poco: se cachean para no golpear Postgres en
// cada cálculo de forecasting. TTL largo por defecto (12 h) porque productos,
// proveedores y sucursales cambian rara vez.
const CATALOG_TTL_MS = Number(process.env.FORECASTING_CATALOG_TTL_MS || 12 * 60 * 60 * 1000);
let catalogCache = { data: null, expiresAt: 0 };
let catalogInflight = null;

// Flags de descontinuado: se consultan aparte y con TTL corto porque el usuario
// espera que "no reponer" surta efecto al instante, aunque el snapshot diario
// siga vigente. El PATCH de productos invalida este cache explícitamente.
const DISCONTINUED_TTL_MS = Number(process.env.FORECASTING_DISCONTINUED_TTL_MS || 60 * 1000);
let discontinuedCache = { data: null, expiresAt: 0 };
let discontinuedInflight = null;

async function loadCatalog() {
  if (catalogCache.data && catalogCache.expiresAt > Date.now()) {
    return catalogCache.data;
  }
  if (catalogInflight) return catalogInflight;
  catalogInflight = (async () => {
    try {
      // Secuencial a propósito: son consultas pequeñas y el objetivo es no
      // abrir varias conexiones del pool dedicado al mismo tiempo.
      const products = await forecastingPool.query("SELECT * FROM products");
      const suppliers = await forecastingPool.query("SELECT * FROM suppliers");
      const branches = await forecastingPool.query("SELECT * FROM branches");
      const data = {
        products: products.rows,
        suppliers: suppliers.rows,
        branches: branches.rows,
      };
      catalogCache = { data, expiresAt: Date.now() + CATALOG_TTL_MS };
      return data;
    } finally {
      catalogInflight = null;
    }
  })();
  return catalogInflight;
}

function invalidateCatalogCache() {
  catalogCache = { data: null, expiresAt: 0 };
}

async function loadDiscontinuedFlags() {
  if (discontinuedCache.data && discontinuedCache.expiresAt > Date.now()) {
    return discontinuedCache.data;
  }
  if (discontinuedInflight) return discontinuedInflight;
  discontinuedInflight = (async () => {
    try {
      const result = await forecastingPool.query(
        "SELECT id_product, is_discontinued FROM products"
      );
      const data = result.rows;
      discontinuedCache = { data, expiresAt: Date.now() + DISCONTINUED_TTL_MS };
      return data;
    } finally {
      discontinuedInflight = null;
    }
  })();
  return discontinuedInflight;
}

// Se llama cuando un producto cambia de estado (descontinuar / reactivar) para
// que el siguiente request vea el cambio sin esperar al snapshot diario.
function invalidateForecastingCaches() {
  catalogCache = { data: null, expiresAt: 0 };
  discontinuedCache = { data: null, expiresAt: 0 };
}

class ForecastingRepository {
  async loadDataset({ branchId = null, skuId = null, from, to, sequential = false }) {
    const branch = branchId === null || branchId === undefined || branchId === "" ? null : Number(branchId);
    const sku = skuId === null || skuId === undefined || skuId === "" ? null : Number(skuId);

    const salesQuery = `
      SELECT s.fk_product AS sku_id,
             s.fk_id_branch AS branch_id,
             s.date::text AS date,
             COALESCE(SUM(s.amount), 0)::float8 AS units,
             COALESCE(SUM(s.p_total), 0)::float8 AS revenue,
             COALESCE(SUM(s.revenue), 0)::float8 AS profit,
             CASE WHEN SUM(s.amount) <> 0 THEN SUM(s.p_total) / SUM(s.amount) ELSE NULL END AS unit_price
      FROM sales s
      WHERE s.date >= $1::date
        AND s.date <= $2::date
        AND ($3::int IS NULL OR s.fk_id_branch = $3)
        AND ($4::int IS NULL OR s.fk_product = $4)
      GROUP BY s.fk_product, s.fk_id_branch, s.date
      ORDER BY s.date ASC
    `;

    const entriesQuery = `
      SELECT ex.fk_product AS sku_id,
             ex.fk_branch AS branch_id,
             e.date::date::text AS date,
             COALESCE(SUM(e.amount), 0)::float8 AS units
      FROM entries e
      INNER JOIN existence ex ON ex.id_existence = e.fk_existence
      WHERE e.date >= $1::date
        AND e.date <= $2::date
        AND ($3::int IS NULL OR ex.fk_branch = $3)
        AND ($4::int IS NULL OR ex.fk_product = $4)
      GROUP BY ex.fk_product, ex.fk_branch, e.date::date
      ORDER BY e.date::date ASC
    `;

    const stockQuery = `
      SELECT fk_product AS sku_id,
             fk_branch AS branch_id,
             COALESCE(SUM(amount), 0)::float8 AS stock
      FROM existence
      WHERE ($1::int IS NULL OR fk_branch = $1)
        AND ($2::int IS NULL OR fk_product = $2)
      GROUP BY fk_product, fk_branch
    `;

    const salesParams = [from, to, branch, sku];
    let sales;
    let entries;
    let stock;

    if (sequential) {
      // El job de fondo prioriza no saturar Postgres antes que la latencia.
      sales = await forecastingPool.query(salesQuery, salesParams);
      entries = await forecastingPool.query(entriesQuery, salesParams);
      stock = await forecastingPool.query(stockQuery, [branch, sku]);
    } else {
      [sales, entries, stock] = await Promise.all([
        forecastingPool.query(salesQuery, salesParams),
        forecastingPool.query(entriesQuery, salesParams),
        forecastingPool.query(stockQuery, [branch, sku]),
      ]);
    }

    const catalog = await loadCatalog();

    return {
      sales: sales.rows,
      entries: entries.rows,
      stock: stock.rows,
      products: catalog.products,
      suppliers: catalog.suppliers,
      branches: catalog.branches,
    };
  }

  // Sólo id + flag: consulta barata para refrescar el estado de descontinuado
  // sin reconstruir el snapshot completo.
  async loadDiscontinuedFlags() {
    return loadDiscontinuedFlags();
  }
}

module.exports = {
  ForecastingRepository,
  loadDiscontinuedFlags,
  invalidateCatalogCache,
  invalidateForecastingCaches,
};
