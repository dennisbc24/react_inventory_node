const express = require("express");
const router = express.Router();
const { pool } = require("../../config/db");

function slugify(txt){
  return String(txt).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}

// Solo lectura pública - sin authJwt - fuente de verdad sigue siendo la misma BD
// Usa estos endpoints desde cocinamejor.store (Next.js)

router.get("/products", async (req, res, next) => {
  try {
    const { category, limit, offset, q } = req.query;
    const lim = Math.min(Math.max(parseInt(limit||'50',10)||50,1),100);
    const off = Math.max(parseInt(offset||'0',10)||0,0);

    let where = [];
    let params = [];
    let idx = 1;

    if (category) {
      // compat: category puede ser id numérico o slug
      const isNum = /^\d+$/.test(String(category));
      if (isNum) {
        where.push(`p.fk_category=$${idx++}`);
        params.push(Number(category));
      } else {
        // resuelve slug -> id para índice
        const cat = await pool.query("SELECT id_category FROM categories WHERE slug=$1", [slugify(category)]);
        if (cat.rows.length===0) return res.json([]);
        where.push(`p.fk_category=$${idx++}`);
        params.push(cat.rows[0].id_category);
      }
    }
    if (q) {
      where.push(`p.name ILIKE $${idx++}`);
      params.push(`%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    // mantenemos activo: si shop quiere ocultar categoría inactiva filtramos por categories.active
    // pero no excluimos productos sin categoría
    const sql = `SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.active AS category_active
                 FROM products p LEFT JOIN categories c ON p.fk_category=c.id_category
                 ${whereSql}
                 ORDER BY p.name ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(lim, off);
    const response = await pool.query(sql, params);
    res.json(response.rows);
  } catch (e) { next(e); }
});

router.get("/categories", async (req, res, next) => {
  try {
    const { withCounts } = req.query;
    if (withCounts === 'true') {
      const r = await pool.query(`
        SELECT c.*, (SELECT COUNT(*)::int FROM products p WHERE p.fk_category=c.id_category) AS product_count
        FROM categories c WHERE COALESCE(c.active,true)=true
        ORDER BY COALESCE(c.position,9999) ASC, c.name ASC`);
      return res.json(r.rows);
    }
    const r = await pool.query("SELECT * FROM categories WHERE COALESCE(active,true)=true ORDER BY COALESCE(position,9999) ASC, name ASC");
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/categories/:slugOrId", async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const isNum = /^\d+$/.test(String(slugOrId));
    const q = isNum
      ? "SELECT c.*, (SELECT COUNT(*)::int FROM products p WHERE p.fk_category=c.id_category) AS product_count FROM categories c WHERE c.id_category=$1"
      : "SELECT c.*, (SELECT COUNT(*)::int FROM products p WHERE p.fk_category=c.id_category) AS product_count FROM categories c WHERE c.slug=$1";
    const r = await pool.query(q, [isNum ? Number(slugOrId) : slugify(slugOrId)]);
    if (r.rows.length===0) return res.status(404).json({ message: "Categoría no encontrada" });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await pool.query("SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON p.fk_category=c.id_category WHERE p.id_product = $1", [id]);
    if (response.rows.length === 0) return res.status(404).json({ message: "Producto no encontrado" });
    res.json(response.rows[0]);
  } catch (e) { next(e); }
});

router.get("/existence", async (req, res, next) => {
  try {
    const product = req.query.product;
    if (!product) return res.status(400).json({ message: "query ?product= id_product requerido" });
    const response = await pool.query(
      "SELECT public.branches.name AS branch_name, amount, public.products.name AS product, public.existence.updated, id_existence FROM public.existence INNER JOIN public.branches ON public.existence.fk_branch = public.branches.id_branch INNER JOIN public.products ON public.existence.fk_product = public.products.id_product WHERE public.existence.fk_product = $1",
      [product]
    );
    res.json(response.rows);
  } catch (e) { next(e); }
});

router.get("/existence/inStock", async (req, res, next) => {
  try {
    const response = await pool.query("SELECT products.name AS product, SUM(existence.amount) AS total_amount, products.cost AS costo FROM existence INNER JOIN branches ON existence.fk_branch = branches.id_branch INNER JOIN products ON existence.fk_product = products.id_product GROUP BY products.name, products.cost HAVING SUM(existence.amount) >= 1 ORDER BY total_amount ASC, LOWER(products.name) ASC");
    res.json(response.rows);
  } catch (e) { next(e); }
});

router.get("/existence/stockLow", async (req, res, next) => {
  try {
    const { ExistenceService } = require("../../services/existence_service");
    const service = new ExistenceService();
    const data = await service.getStockLow();
    res.json(data);
  } catch (e) { next(e); }
});

router.get("/ventas/topSellingProducts", async (req, res, next) => {
  try {
    const response = await pool.query("SELECT * FROM ventas_top_selling LIMIT 20"); // ajusta a tu vista real si existe
    res.json(response.rows);
  } catch (e) {
    // fallback: si no existe vista, devuelve vacío en lugar de 500
    res.json([]);
  }
});

module.exports = router;
