-- 003: Flag para venta online - DB compartida inventory/shop
-- Permite clasificar productos visibles en ecommerce

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_products_is_online ON products(is_online);
-- Para filtros combinados (categoria + online)
CREATE INDEX IF NOT EXISTS idx_products_fk_category_is_online ON products(fk_category, is_online);

-- Opcional: marca como online los que ya tienen precio y stock (ajusta a tu criterio)
-- UPDATE products SET is_online = true WHERE list_price IS NOT NULL AND list_price > 0;
