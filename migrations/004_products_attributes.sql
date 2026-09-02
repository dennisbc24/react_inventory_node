-- 004: Atributos variables por producto (licuadora vs sartén) -> JSONB
ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_products_attributes_gin ON products USING GIN (attributes);

-- Ejemplos:
-- Licuadora: {"Tipo":"Licuadora","Potencia":"800 watts pico","Modelo":"BLSTPEG-NPB","Hecho en":"México","Material":"Vidrio","Capacidad":"1L"}
-- Sarten: {"Tipo":"Sartenes","Antiadherente":"No","Apto lavavajillas":"Sí","Diámetro":"28 cm","Material":"Acero inoxidable"}
