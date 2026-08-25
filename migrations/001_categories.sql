-- Normalizada: categorías para productos
CREATE TABLE IF NOT EXISTS categories (
  id_category SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created TIMESTAMPTZ DEFAULT NOW()
);

-- Columna FK en products (nullable para migración)
ALTER TABLE products ADD COLUMN IF NOT EXISTS fk_category INT REFERENCES categories(id_category) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_fk_category ON products(fk_category);

-- Seed categorías ejemplo (ajusta a tu negocio cocina)
INSERT INTO categories (name) VALUES
  ('Ollas'), ('Sartenes'), ('Utensilios'), ('Cuchillos'), ('Electro'), ('Accesorios')
ON CONFLICT (name) DO NOTHING;

-- Opcional: asigna una categoría por defecto a productos sin categoría
-- UPDATE products SET fk_category = (SELECT id_category FROM categories WHERE name='Accesorios' LIMIT 1) WHERE fk_category IS NULL;
