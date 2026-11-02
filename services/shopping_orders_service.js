const { pool } = require("../config/db");

const httpError = (status, message) => Object.assign(new Error(message), { status });

class ShoppingOrdersService {
  normalizeItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw httpError(400, "Agrega al menos un producto al pedido");
    }

    const byProduct = new Map();
    for (const raw of items) {
      const rawIdProduct = Number(raw?.id_product);
      const hasProduct = Number.isInteger(rawIdProduct) && rawIdProduct > 0;
      const product_name = raw?.product_name ? String(raw.product_name).trim() : "";

      if (!hasProduct && !product_name) {
        throw httpError(400, "Selecciona un producto o escribe un nombre provisional");
      }

      const quantity = Number(raw?.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw httpError(400, "La cantidad de cada producto debe ser mayor a 0");
      }

      const unit_cost = Number(raw?.unit_cost ?? 0);
      if (!Number.isFinite(unit_cost) || unit_cost < 0) {
        throw httpError(400, "El costo unitario no puede ser negativo");
      }

      const rawIdShopping = raw?.id_shopping === null || raw?.id_shopping === undefined || raw?.id_shopping === ''
        ? null
        : Number(raw.id_shopping);
      const id_shopping = hasProduct && Number.isInteger(rawIdShopping) && rawIdShopping > 0
        ? rawIdShopping
        : null;

      const key = hasProduct ? `p:${rawIdProduct}` : `n:${product_name.toLowerCase()}`;
      byProduct.set(key, {
        id_product: hasProduct ? rawIdProduct : null,
        product_name: hasProduct ? null : product_name,
        id_shopping,
        quantity,
        unit_cost,
      });
    }

    return [...byProduct.values()];
  }

  async insertItems(client, id_order, items) {
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      await client.query(
        `INSERT INTO shopping_order_items
           (fk_order, fk_product, product_name, fk_shopping, quantity, unit_cost, position, created, updated)
         VALUES (
           $1,
           $2,
           $3,
           (SELECT id_shopping FROM shopping_list WHERE id_shopping = $4 AND fk_product = $2),
           $5,
           $6,
           $7,
           NOW(),
           NOW()
         )`,
        [id_order, item.id_product, item.product_name, item.id_shopping, item.quantity, item.unit_cost, index]
      );
    }
  }

  async findAll() {
    const result = await pool.query(`
      SELECT o.id_order,
             o.title,
             o.note,
             o.status,
             o.ordered_at,
             o.created,
             o.updated,
             u.name AS created_by,
             COUNT(i.id_item)::int AS items_count,
             COALESCE(SUM(i.quantity * i.unit_cost), 0) AS total
      FROM shopping_orders o
      LEFT JOIN users u ON u.id_user = o.fk_user
      LEFT JOIN shopping_order_items i ON i.fk_order = o.id_order
      GROUP BY o.id_order, u.name
      ORDER BY CASE WHEN o.status = 'draft' THEN 0 ELSE 1 END, o.updated DESC, o.id_order DESC
    `);
    return result.rows;
  }

  async findById(id_order) {
    const orderResult = await pool.query(`
      SELECT o.id_order,
             o.title,
             o.note,
             o.status,
             o.ordered_at,
             o.created,
             o.updated,
             u.name AS created_by
      FROM shopping_orders o
      LEFT JOIN users u ON u.id_user = o.fk_user
      WHERE o.id_order = $1
    `, [id_order]);

    if (orderResult.rows.length === 0) return null;

    const itemsResult = await pool.query(`
      SELECT i.id_item,
             i.fk_product,
             i.fk_shopping,
             i.quantity,
             i.unit_cost,
             i.position,
             COALESCE(p.name, i.product_name) AS product_name,
             p.url_image,
             p.fk_supplier,
             s.name AS supplier_name,
             CASE WHEN p.id_product IS NULL THEN NULL ELSE COALESCE(e.total_stock, 0) END AS total_stock
      FROM shopping_order_items i
      LEFT JOIN products p ON p.id_product = i.fk_product
      LEFT JOIN suppliers s ON s.id_supplier = p.fk_supplier
      LEFT JOIN (
        SELECT fk_product, SUM(amount) AS total_stock
        FROM existence
        GROUP BY fk_product
      ) e ON e.fk_product = p.id_product
      WHERE i.fk_order = $1
      ORDER BY i.position ASC, i.id_item ASC
    `, [id_order]);

    return { ...orderResult.rows[0], items: itemsResult.rows };
  }

  async create({ title, note, items, fk_user }) {
    const cleanItems = this.normalizeItems(items);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO shopping_orders (title, note, status, fk_user, created, updated)
         VALUES ($1, $2, 'draft', $3, NOW(), NOW())
         RETURNING id_order`,
        [title ? String(title).trim() : null, note ? String(note).trim() : null, fk_user || null]
      );

      const id_order = inserted.rows[0].id_order;
      await this.insertItems(client, id_order, cleanItems);
      await client.query("COMMIT");
      return this.findById(id_order);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateDraft(id_order, { title, note, items }) {
    const cleanItems = this.normalizeItems(items);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const current = await client.query(
        "SELECT status FROM shopping_orders WHERE id_order = $1 FOR UPDATE",
        [id_order]
      );

      if (current.rows.length === 0) throw httpError(404, "Pedido no encontrado");
      if (current.rows[0].status !== "draft") {
        throw httpError(409, "El pedido ya fue confirmado y no se puede modificar");
      }

      await client.query(
        `UPDATE shopping_orders
         SET title = $1, note = $2, updated = NOW()
         WHERE id_order = $3`,
        [title ? String(title).trim() : null, note ? String(note).trim() : null, id_order]
      );

      await client.query("DELETE FROM shopping_order_items WHERE fk_order = $1", [id_order]);
      await this.insertItems(client, id_order, cleanItems);
      await client.query("COMMIT");
      return this.findById(id_order);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async confirm(id_order) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const current = await client.query(
        "SELECT status FROM shopping_orders WHERE id_order = $1 FOR UPDATE",
        [id_order]
      );

      if (current.rows.length === 0) throw httpError(404, "Pedido no encontrado");
      if (current.rows[0].status !== "draft") {
        throw httpError(409, "El pedido ya fue confirmado");
      }

      await client.query(
        `UPDATE shopping_orders
         SET status = 'ordered', ordered_at = NOW(), updated = NOW()
         WHERE id_order = $1`,
        [id_order]
      );

      await client.query(
        `UPDATE shopping_list sl
         SET status = 'purchased', updated = NOW()
         WHERE sl.status = 'pending'
           AND sl.id_shopping IN (
             SELECT fk_shopping
             FROM shopping_order_items
             WHERE fk_order = $1 AND fk_shopping IS NOT NULL
           )`,
        [id_order]
      );

      await client.query("COMMIT");
      return this.findById(id_order);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(id_order) {
    const current = await pool.query(
      "SELECT status FROM shopping_orders WHERE id_order = $1",
      [id_order]
    );

    if (current.rows.length === 0) throw httpError(404, "Pedido no encontrado");
    if (current.rows[0].status !== "draft") {
      throw httpError(409, "Solo se pueden eliminar pedidos en borrador");
    }

    await pool.query("DELETE FROM shopping_orders WHERE id_order = $1", [id_order]);
    return { message: "Pedido eliminado" };
  }
}

module.exports = { ShoppingOrdersService };
