-- 004: Productos nuevos/provisionales dentro de una proforma de pedido.
-- No se crean en products: solo viven en el pedido con un nombre provisional.

ALTER TABLE shopping_order_items ALTER COLUMN fk_product DROP NOT NULL;
ALTER TABLE shopping_order_items ADD COLUMN IF NOT EXISTS product_name TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_shopping_order_item_product'
  ) THEN
    ALTER TABLE shopping_order_items
      ADD CONSTRAINT chk_shopping_order_item_product
      CHECK (
        fk_product IS NOT NULL
        OR (product_name IS NOT NULL AND btrim(product_name) <> '')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shopping_order_custom_name
  ON shopping_order_items (fk_order, lower(btrim(product_name)))
  WHERE fk_product IS NULL;
