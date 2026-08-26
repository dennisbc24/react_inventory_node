-- 002: Extiende categories para uso compartido con shop (cocinamejor.store)
-- Idempotente, seguro para DB compartida

-- Columnas nuevas
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated TIMESTAMPTZ DEFAULT NOW();

-- Función helper para slugify simple (sin extensión unaccent)
CREATE OR REPLACE FUNCTION slugify(txt TEXT) RETURNS TEXT AS $$
  SELECT lower(regexp_replace(regexp_replace(trim(txt), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'));
$$ LANGUAGE SQL IMMUTABLE;

-- Backfill slug para filas existentes (no pisa slug manual)
UPDATE categories SET slug = slugify(name) WHERE slug IS NULL OR slug = '';

-- Asegura unicidad: primero limpia duplicados potenciales por slug
-- Si hay duplicados, añade sufijo id_category
WITH dups AS (
  SELECT slug, array_agg(id_category ORDER BY id_category) AS ids, count(*) AS c
  FROM categories WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1
)
UPDATE categories c SET slug = c.slug || '-' || c.id_category
FROM dups WHERE c.slug = dups.slug AND c.id_category <> dups.ids[1];

-- Índices y constraint
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_slug ON categories(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
CREATE INDEX IF NOT EXISTS idx_categories_position ON categories(position);
CREATE INDEX IF NOT EXISTS idx_categories_slug_active ON categories(slug, active);

-- Trigger updated
CREATE OR REPLACE FUNCTION set_categories_updated() RETURNS TRIGGER AS $$
BEGIN NEW.updated = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_categories_updated();

-- Actualiza seeds existentes con slug (si fueron insertadas por 001)
UPDATE categories SET slug = slugify(name) WHERE slug IS NULL;
