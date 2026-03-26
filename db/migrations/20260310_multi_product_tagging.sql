ALTER TABLE assets ADD COLUMN IF NOT EXISTS products TEXT[] DEFAULT '{}';

UPDATE assets
SET products = ARRAY[product]
WHERE product IS NOT NULL
  AND (products IS NULL OR products = '{}');

CREATE INDEX IF NOT EXISTS idx_assets_products ON assets USING GIN(products);
