const express = require("express");
const router = express.Router();
const { pool } = require("../../config/db");

// Solo lectura pública - sin authJwt - fuente de verdad sigue siendo la misma BD
// Usa estos endpoints desde cocinamejor.store (Next.js)

router.get("/products", async (req, res, next) => {
  try {
    const { category } = req.query;
    if (category) {
      const response = await pool.query("SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.fk_category=c.id_category WHERE p.fk_category=$1 ORDER BY p.name ASC", [category]);
      return res.json(response.rows);
    }
    const response = await pool.query("SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.fk_category=c.id_category ORDER BY p.name ASC");
    res.json(response.rows);
  } catch (e) { next(e); }
});

router.get("/categories", async (req, res, next) => {
  try {
    const r = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await pool.query("SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.fk_category=c.id_category WHERE p.id_product = $1", [id]);
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
