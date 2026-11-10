-- 005: Facturas de compra
-- Guarda el monto original (PEN o USD), el tipo de cambio usado y el monto en soles.
-- El límite mensual de S/8000 se valida en el servicio (INVOICES_MONTHLY_LIMIT).

CREATE TABLE IF NOT EXISTS invoices (
  id_invoice SERIAL PRIMARY KEY,
  invoice_date DATE NOT NULL,
  supplier TEXT NOT NULL,
  invoice_number TEXT,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'PEN' CHECK (currency IN ('PEN', 'USD')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  exchange_rate NUMERIC(12, 4) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  amount_pen NUMERIC(12, 2) NOT NULL CHECK (amount_pen > 0),
  fk_user INTEGER REFERENCES users(id_user),
  created TIMESTAMPTZ DEFAULT NOW(),
  updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (invoice_date DESC);
