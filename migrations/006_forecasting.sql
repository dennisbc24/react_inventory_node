-- 006: Demand forecasting and restocking support
-- Lead times are expressed in calendar days. Products override supplier defaults.

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lead_time_min_days INTEGER DEFAULT 4;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lead_time_max_days INTEGER DEFAULT 7;

ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_min_days INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_max_days INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_suppliers_lead_time') THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT chk_suppliers_lead_time
      CHECK (
        lead_time_min_days IS NULL OR lead_time_max_days IS NULL
        OR (lead_time_min_days >= 0 AND lead_time_max_days >= lead_time_min_days)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_lead_time') THEN
    ALTER TABLE products
      ADD CONSTRAINT chk_products_lead_time
      CHECK (
        lead_time_min_days IS NULL OR lead_time_max_days IS NULL
        OR (lead_time_min_days >= 0 AND lead_time_max_days >= lead_time_min_days)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_forecast
  ON sales (fk_id_branch, fk_product, date);

CREATE INDEX IF NOT EXISTS idx_existence_product_branch
  ON existence (fk_product, fk_branch);

CREATE INDEX IF NOT EXISTS idx_entries_date
  ON entries (date);
