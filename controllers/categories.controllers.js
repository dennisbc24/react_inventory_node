const { pool } = require("../config/db");

function slugify(txt) {
  return String(txt)
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const getCategories = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    // Admin en inventory ve todo; por defecto solo activas para no romper shop
    let q = "SELECT c.*, (SELECT COUNT(*)::int FROM products p WHERE p.fk_category=c.id_category) AS product_count FROM categories c";
    const params = [];
    if (includeInactive !== 'true') {
      q += " WHERE COALESCE(c.active,true)=true";
    }
    q += " ORDER BY COALESCE(c.position,9999) ASC, c.name ASC";
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { next(e); }
};

const postCategory = async (req, res, next) => {
  try {
    const { name, slug, description, image_url, active, position } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: "name requerido" });
    const cleanName = String(name).trim();
    const cleanSlug = slug ? slugify(slug) : slugify(cleanName);
    if (!cleanSlug) return res.status(400).json({ message: "slug inválido" });

    // Intenta insertar; si conflicto por name o slug, devuelve existente
    const r = await pool.query(
      `INSERT INTO categories (name, slug, description, image_url, active, position)
       VALUES ($1,$2,$3,$4,COALESCE($5,true),COALESCE($6,0))
       ON CONFLICT (slug) DO NOTHING RETURNING *`,
      [cleanName, cleanSlug, description || null, image_url || null, active, position]
    );
    if (r.rows.length === 0) {
      // conflicto: busca por slug o name
      const existing = await pool.query("SELECT * FROM categories WHERE slug=$1 OR name=$2 LIMIT 1", [cleanSlug, cleanName]);
      if (existing.rows.length) return res.status(200).json(existing.rows[0]);
      return res.status(409).json({ message: "Categoría ya existe (name/slug duplicado)" });
    }
    res.status(201).json(r.rows[0]);
  } catch (e) { 
    if (e.code === '23505') return res.status(409).json({ message: "name o slug duplicado", detail: e.detail });
    next(e); 
  }
};

const patchCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image_url, active, position } = req.body;
    const fields = [];
    const vals = [];
    let idx = 1;
    if (name !== undefined) { fields.push(`name=$${idx++}`); vals.push(String(name).trim()); }
    if (slug !== undefined) { fields.push(`slug=$${idx++}`); vals.push(slug ? slugify(slug) : null); }
    else if (name !== undefined) { fields.push(`slug=$${idx++}`); vals.push(slugify(name)); }
    if (description !== undefined) { fields.push(`description=$${idx++}`); vals.push(description); }
    if (image_url !== undefined) { fields.push(`image_url=$${idx++}`); vals.push(image_url); }
    if (active !== undefined) { fields.push(`active=$${idx++}`); vals.push(active); }
    if (position !== undefined) { fields.push(`position=$${idx++}`); vals.push(position); }
    if (fields.length === 0) return res.status(400).json({ message: "nada para actualizar" });
    vals.push(id);
    const q = `UPDATE categories SET ${fields.join(", ")} WHERE id_category=$${idx} RETURNING *`;
    const r = await pool.query(q, vals);
    if (r.rows.length === 0) return res.status(404).json({ message: "Categoría no encontrada" });
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: "name o slug duplicado", detail: e.detail });
    next(e);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // ?force=true -> SET NULL en productos, si no, bloquea si tiene productos
    const count = await pool.query("SELECT COUNT(*)::int AS c FROM products WHERE fk_category=$1", [id]);
    if (count.rows[0].c > 0 && force !== 'true') {
      return res.status(409).json({ message: `Categoría tiene ${count.rows[0].c} productos. Usa ?force=true para desasignar o reasigna primero.`, count: count.rows[0].c });
    }
    // soft-delete por defecto si tiene productos: desactiva en lugar de borrar para no romper shop
    if (count.rows[0].c > 0) {
      await pool.query("UPDATE products SET fk_category=NULL WHERE fk_category=$1", [id]);
    }
    const r = await pool.query("DELETE FROM categories WHERE id_category=$1 RETURNING *", [id]);
    if (r.rows.length === 0) return res.status(404).json({ message: "Categoría no encontrada" });
    res.json({ message: "Categoría eliminada", category: r.rows[0] });
  } catch (e) { next(e); }
};

const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    // acepta id numérico o slug
    const isNum = /^\d+$/.test(String(id));
    const q = isNum
      ? "SELECT c.*, (SELECT COUNT(*)::int FROM products p WHERE p.fk_category=c.id_category) AS product_count FROM categories c WHERE c.id_category=$1"
      : "SELECT c.*, (SELECT COUNT(*)::int FROM products p WHERE p.fk_category=c.id_category) AS product_count FROM categories c WHERE c.slug=$1";
    const r = await pool.query(q, [isNum ? Number(id) : slugify(id)]);
    if (r.rows.length === 0) return res.status(404).json({ message: "Categoría no encontrada" });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
};

module.exports = { getCategories, postCategory, patchCategory, deleteCategory, getCategoryById };
