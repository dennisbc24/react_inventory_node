const { pool } = require("../config/db");

const MONTHLY_LIMIT = Number(process.env.INVOICES_MONTHLY_LIMIT || 8000);
const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const httpError = (status, message) => Object.assign(new Error(message), { status });

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
};

class InvoicesService {
  normalize(data = {}) {
    const invoice_date = String(data.invoice_date || "").trim();
    if (!isValidDate(invoice_date)) throw httpError(400, "Fecha de factura inválida");

    const supplier = String(data.supplier || "").trim();
    if (!supplier) throw httpError(400, "El proveedor es obligatorio");

    const currency = data.currency === "USD" ? "USD" : "PEN";
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw httpError(400, "El monto debe ser mayor a 0");
    }

    const rawRate = data.exchange_rate === "" || data.exchange_rate === undefined || data.exchange_rate === null
      ? 1
      : Number(data.exchange_rate);
    const exchange_rate = currency === "USD" ? rawRate : 1;
    if (!Number.isFinite(exchange_rate) || exchange_rate <= 0) {
      throw httpError(400, "El tipo de cambio debe ser mayor a 0");
    }

    const invoice_number = data.invoice_number ? String(data.invoice_number).trim() : null;
    const description = data.description ? String(data.description).trim() : null;

    return {
      invoice_date,
      supplier,
      invoice_number,
      description,
      currency,
      amount: round2(amount),
      exchange_rate,
      amount_pen: round2(amount * exchange_rate),
    };
  }

  async assertMonthlyLimit(client, { invoice_date, amount_pen, excludeId = null }) {
    const result = await client.query(
      `SELECT COALESCE(SUM(amount_pen), 0) AS total
       FROM invoices
       WHERE date_trunc('month', invoice_date) = date_trunc('month', $1::date)
         AND ($2::int IS NULL OR id_invoice <> $2)`,
      [invoice_date, excludeId || null]
    );

    const monthTotal = Number(result.rows[0].total);
    if (round2(monthTotal + amount_pen) > MONTHLY_LIMIT) {
      const available = round2(Math.max(0, MONTHLY_LIMIT - monthTotal));
      throw httpError(
        400,
        `El límite mensual es S/.${MONTHLY_LIMIT.toFixed(2)}. Disponible en ese mes: S/.${available.toFixed(2)}`
      );
    }
  }

  async findAll({ year, month } = {}) {
    const params = [];
    const conditions = [];

    if (year) {
      params.push(Number(year));
      conditions.push(`EXTRACT(YEAR FROM invoice_date) = $${params.length}`);
    }
    if (month) {
      params.push(Number(month));
      conditions.push(`EXTRACT(MONTH FROM invoice_date) = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT i.id_invoice,
              TO_CHAR(i.invoice_date, 'YYYY-MM-DD') AS invoice_date,
              i.supplier,
              i.invoice_number,
              i.description,
              i.currency,
              i.amount,
              i.exchange_rate,
              i.amount_pen,
              i.created,
              i.updated,
              u.name AS created_by
       FROM invoices i
       LEFT JOIN users u ON u.id_user = i.fk_user
       ${where}
       ORDER BY i.invoice_date DESC, i.id_invoice DESC`,
      params
    );
    return result.rows;
  }

  async summary({ year, month } = {}) {
    const params = [];
    const conditions = [];

    if (year) {
      params.push(Number(year));
      conditions.push(`EXTRACT(YEAR FROM invoice_date) = $${params.length}`);
    }
    if (month) {
      params.push(Number(month));
      conditions.push(`EXTRACT(MONTH FROM invoice_date) = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount_pen), 0) AS total_pen
       FROM invoices
       ${where}`,
      params
    );

    const total = round2(result.rows[0].total_pen);
    return {
      count: result.rows[0].count,
      total_pen: total,
      limit: MONTHLY_LIMIT,
      remaining: round2(Math.max(0, MONTHLY_LIMIT - total)),
    };
  }

  async findById(id) {
    const result = await pool.query(
      `SELECT id_invoice,
              TO_CHAR(invoice_date, 'YYYY-MM-DD') AS invoice_date,
              supplier,
              invoice_number,
              description,
              currency,
              amount,
              exchange_rate,
              amount_pen
       FROM invoices
       WHERE id_invoice = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data, fk_user) {
    const invoice = this.normalize(data);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await this.assertMonthlyLimit(client, invoice);
      const inserted = await client.query(
        `INSERT INTO invoices
           (invoice_date, supplier, invoice_number, description, currency, amount, exchange_rate, amount_pen, fk_user, created, updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING id_invoice`,
        [
          invoice.invoice_date,
          invoice.supplier,
          invoice.invoice_number,
          invoice.description,
          invoice.currency,
          invoice.amount,
          invoice.exchange_rate,
          invoice.amount_pen,
          fk_user || null,
        ]
      );
      await client.query("COMMIT");
      return this.findById(inserted.rows[0].id_invoice);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id, data) {
    const invoice = this.normalize(data);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const current = await client.query("SELECT id_invoice FROM invoices WHERE id_invoice = $1 FOR UPDATE", [id]);
      if (current.rows.length === 0) throw httpError(404, "Factura no encontrada");

      await this.assertMonthlyLimit(client, { ...invoice, excludeId: Number(id) });
      await client.query(
        `UPDATE invoices
         SET invoice_date = $1,
             supplier = $2,
             invoice_number = $3,
             description = $4,
             currency = $5,
             amount = $6,
             exchange_rate = $7,
             amount_pen = $8,
             updated = NOW()
         WHERE id_invoice = $9`,
        [
          invoice.invoice_date,
          invoice.supplier,
          invoice.invoice_number,
          invoice.description,
          invoice.currency,
          invoice.amount,
          invoice.exchange_rate,
          invoice.amount_pen,
          id,
        ]
      );
      await client.query("COMMIT");
      return this.findById(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(id) {
    const result = await pool.query("DELETE FROM invoices WHERE id_invoice = $1 RETURNING id_invoice", [id]);
    if (result.rowCount === 0) throw httpError(404, "Factura no encontrada");
    return { message: "Factura eliminada" };
  }
}

module.exports = { InvoicesService, MONTHLY_LIMIT };
