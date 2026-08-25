const { pool } = require("../config/db");

const getCategories = async (req, res, next) => {
  try {
    const r = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    res.json(r.rows);
  } catch (e) { next(e); }
};

const postCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: "name requerido" });
    const r = await pool.query("INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *", [String(name).trim()]);
    if (r.rows.length === 0) {
      const existing = await pool.query("SELECT * FROM categories WHERE name=$1", [String(name).trim()]);
      return res.json(existing.rows[0]);
    }
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
};

module.exports = { getCategories, postCategory };
