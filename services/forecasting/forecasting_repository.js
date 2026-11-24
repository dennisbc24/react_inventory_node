const { pool } = require("../../config/db");

class ForecastingRepository {
  async loadDataset({ branchId = null, skuId = null, from, to }) {
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

    const [sales, entries, stock, products, suppliers, branches] = await Promise.all([
      pool.query(salesQuery, [from, to, branch, sku]),
      pool.query(entriesQuery, [from, to, branch, sku]),
      pool.query(stockQuery, [branch, sku]),
      pool.query("SELECT * FROM products"),
      pool.query("SELECT * FROM suppliers"),
      pool.query("SELECT * FROM branches"),
    ]);

    return {
      sales: sales.rows,
      entries: entries.rows,
      stock: stock.rows,
      products: products.rows,
      suppliers: suppliers.rows,
      branches: branches.rows,
    };
  }
}

module.exports = { ForecastingRepository };
