-- 003: Proformas / pedidos de compra
-- Un pedido nace como borrador (draft) y se bloquea al confirmarse (ordered).
-- Los items guardan una copia del costo para conservar el historial del pedido.

-- La lista de compras es la base de la que se seleccionan los productos.
-- Se incluye por si la migración se ejecuta en una base nueva.
CREATE TABLE IF NOT EXISTS shopping_list (
  id_shopping SERIAL PRIMARY KEY,
  fk_product INTEGER NOT NULL REFERENCES products(id_product),
  fk_user INTEGER REFERENCES users(id_user),
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  position INTEGER NOT NULL DEFAULT 0,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shopping_pending
  ON shopping_list (fk_product) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS shopping_orders (
  id_order SERIAL PRIMARY KEY,
  title TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered')),
  fk_user INTEGER REFERENCES users(id_user),
  ordered_at TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT NOW(),
  updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_order_items (
  id_item SERIAL PRIMARY KEY,
  fk_order INTEGER NOT NULL REFERENCES shopping_orders(id_order) ON DELETE CASCADE,
  fk_product INTEGER NOT NULL REFERENCES products(id_product),
  fk_shopping INTEGER REFERENCES shopping_list(id_shopping) ON DELETE SET NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  position INTEGER NOT NULL DEFAULT 0,
  created TIMESTAMPTZ DEFAULT NOW(),
  updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (fk_order, fk_product)
);

CREATE INDEX IF NOT EXISTS idx_shopping_orders_status ON shopping_orders(status);
CREATE INDEX IF NOT EXISTS idx_shopping_orders_updated ON shopping_orders(updated DESC);
CREATE INDEX IF NOT EXISTS idx_shopping_order_items_order ON shopping_order_items(fk_order);
