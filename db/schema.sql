-- Shelf — Database Schema
-- Run via: psql $POSTGRES_URL -f db/schema.sql
-- NOTE: The app auto-runs this via runMigrations() on first request.
--       This file is for reference and manual use only.

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  blob_pathname TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image','video','pdf','raw','other')),
  mime_type TEXT,
  file_size_kb INTEGER,
  width_px INTEGER,
  height_px INTEGER,
  tags TEXT[] DEFAULT '{}',
  ai_tags TEXT[] DEFAULT '{}',
  ai_tagged_at TIMESTAMPTZ,
  product TEXT,
  products TEXT[] DEFAULT '{}',
  collection TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_assets_product ON assets(product);
CREATE INDEX IF NOT EXISTS idx_assets_products ON assets USING GIN(products);
CREATE INDEX IF NOT EXISTS idx_assets_collection ON assets(collection);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_file_type ON assets(file_type);
-- Full-text search index on title only (array_to_string is not IMMUTABLE)
-- Broader search handled at query time via to_tsvector across title+description+tags
CREATE INDEX IF NOT EXISTS idx_assets_title_tsv ON assets USING GIN(to_tsvector('simple', COALESCE(title, '')));
