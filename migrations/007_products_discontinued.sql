-- 007: Productos descontinuados / no reponer
-- Permite excluir SKUs del plan de reposicion sin borrarlos del historial.
-- El flag puede activarse y desactivarse en cualquier momento desde la ficha del producto.

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_discontinued BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_products_is_discontinued ON products(is_discontinued);
