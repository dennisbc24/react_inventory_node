const { pool } = require("../config/db");

class ShoppingListService {
  constructor() {}

  async findAll() {
    const query = await pool.query(`
      SELECT sl.id_shopping,
             p.id_product,
             p.url_image,
             p.name AS product_name,
             p.cost,
             COALESCE(e.total_stock, 0) AS total_stock,
             u.name AS added_by,
             sl.source,
             sl.status,
             sl.created,
             sl.updated
      FROM shopping_list sl
      INNER JOIN products p ON p.id_product = sl.fk_product
      LEFT JOIN users u ON u.id_user = sl.fk_user
      LEFT JOIN (
        SELECT fk_product, SUM(amount) AS total_stock
        FROM existence
        GROUP BY fk_product
      ) e ON e.fk_product = p.id_product
      WHERE sl.status = 'pending'
      ORDER BY sl.position ASC NULLS LAST, COALESCE(e.total_stock, 0) ASC, LOWER(p.name) ASC
    `);
    return query.rows;
  }

  async create({ id_product, fk_user }) {
    const already = await pool.query(
      "SELECT id_shopping FROM shopping_list WHERE fk_product = $1 AND status = 'pending'",
      [id_product]
    );
    if (already.rows.length > 0) {
      return { message: "El producto ya está en la lista", id_shopping: already.rows[0].id_shopping };
    }
    const min = await pool.query(
      "SELECT COALESCE(MIN(position), 0) AS min_pos FROM shopping_list WHERE status = 'pending'"
    );
    const position = min.rows[0].min_pos - 1;
    const inserted = await pool.query(
      "INSERT INTO shopping_list (fk_product, fk_user, source, position, created, updated) VALUES ($1, $2, 'manual', $3, NOW(), NOW()) RETURNING id_shopping",
      [id_product, fk_user, position]
    );
    return { message: "Producto agregado a la lista", id_shopping: inserted.rows[0].id_shopping };
  }

  async findByProduct(id_product) {
    const result = await pool.query(
      "SELECT id_shopping FROM shopping_list WHERE fk_product = $1 AND status = 'pending'",
      [id_product]
    );
    return result.rows[0] || null;
  }

  async reorder(orderedIds) {
    if (!Array.isArray(orderedIds)) {
      return { message: "Formato incorrecto" };
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await pool.query(
        "UPDATE shopping_list SET position = $1, updated = NOW() WHERE id_shopping = $2 AND status = 'pending'",
        [i, orderedIds[i]]
      );
    }
    return { message: "Prioridad actualizada" };
  }

  async markPurchased(id_shopping) {
    await pool.query(
      "UPDATE shopping_list SET status = 'purchased', updated = NOW() WHERE id_shopping = $1",
      [id_shopping]
    );
    return { message: "Marcado como comprado" };
  }

  async remove(id_shopping) {
    await pool.query("DELETE FROM shopping_list WHERE id_shopping = $1", [id_shopping]);
    return { message: "Eliminado de la lista" };
  }
}

module.exports = { ShoppingListService };