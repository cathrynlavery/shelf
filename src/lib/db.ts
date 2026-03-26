import { sql } from "@vercel/postgres";

export type FileType = "image" | "video" | "pdf" | "raw" | "other";

// Auto-migration guard: runs once per cold start
let _migrated = false;
async function ensureMigrated() {
  if (_migrated) return;
  await runMigrations();
  _migrated = true;
}
export type AssetStatus = "draft" | "approved" | "archived";

export interface Asset {
  id: string;
  filename: string;
  title: string;
  description: string | null;
  file_url: string;
  blob_pathname: string;
  file_type: FileType;
  mime_type: string | null;
  file_size_kb: number | null;
  width_px: number | null;
  height_px: number | null;
  tags: string[];
  ai_tags: string[];
  ai_tagged_at: string | null;
  products: string[];
  product: string | null;
  collection: string | null;
  status: AssetStatus;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchParams {
  tags?: string[];
  file_type?: FileType;
  status?: AssetStatus;
  product?: string;
  collection?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface CollectionSummary {
  name: string;
  count: number;
  preview_url: string | null;
  latest_title: string | null;
}

interface SearchQueryParts {
  whereClause: string;
  values: unknown[];
}

/** Run schema migrations (idempotent — safe to call on every cold start) */
export async function runMigrations() {
  await sql`
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
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      photo_taken_at TIMESTAMPTZ
    );
  `;

  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS collection TEXT;`;
  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS ai_tags TEXT[] DEFAULT '{}';`;
  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS ai_tagged_at TIMESTAMPTZ;`;
  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS products TEXT[] DEFAULT '{}';`;
  await sql`
    UPDATE assets
    SET products = ARRAY[product]
    WHERE product IS NOT NULL
      AND (products IS NULL OR products = '{}');
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_assets_product ON assets(product);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_assets_products ON assets USING GIN(products);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_assets_collection ON assets(collection);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_assets_file_type ON assets(file_type);`;
  await sql`DROP INDEX IF EXISTS idx_assets_search_tsv;`;
  await sql`CREATE INDEX IF NOT EXISTS idx_assets_title_tsv ON assets USING GIN(to_tsvector('simple', COALESCE(title, '')));`;
  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS photo_taken_at TIMESTAMPTZ;`;
  await sql`CREATE INDEX IF NOT EXISTS idx_assets_photo_taken_at ON assets(photo_taken_at);`;
}

function buildSearchQuery(params: SearchParams): SearchQueryParts {
  const {
    tags,
    file_type,
    status,
    product,
    collection,
    query,
  } = params;

  // Build dynamic WHERE clauses
  const conditions: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [];
  let idx = 1;

  if (tags && tags.length > 0) {
    conditions.push(`tags && $${idx}::text[]`);
    values.push(tags);
    idx++;
  }
  if (file_type) {
    conditions.push(`file_type = $${idx}`);
    values.push(file_type);
    idx++;
  }
  if (status) {
    conditions.push(`status = $${idx}`);
    values.push(status);
    idx++;
  }
  if (product) {
    conditions.push(`$${idx} = ANY(products)`);
    values.push(product);
    idx++;
  }
  if (collection) {
    conditions.push(`collection = $${idx}`);
    values.push(collection);
    idx++;
  }
  if (query?.trim()) {
    conditions.push(
      `to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(array_to_string(tags, ' '), '') || ' ' || coalesce(array_to_string(products, ' '), '')) @@ websearch_to_tsquery('simple', $${idx})`
    );
    values.push(query.trim());
    idx++;
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

export async function searchAssets(params: SearchParams): Promise<Asset[]> {
  await ensureMigrated();
  const { limit = 20, offset = 0 } = params;
  const { whereClause, values } = buildSearchQuery(params);
  const paginationValues = [...values, limit, offset];

  const query = `
    SELECT * FROM assets
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const result = await sql.query(query, paginationValues);
  return result.rows as Asset[];
}

export async function searchAssetsPage(
  params: SearchParams
): Promise<{ assets: Asset[]; total: number }> {
  await ensureMigrated();
  const { limit = 20, offset = 0 } = params;
  const { whereClause, values } = buildSearchQuery(params);
  const pageValues = [...values, limit, offset];

  const [assetResult, countResult] = await Promise.all([
    sql.query(
      `
        SELECT * FROM assets
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `,
      pageValues
    ),
    sql.query(
      `
        SELECT COUNT(*)::int AS total
        FROM assets
        ${whereClause}
      `,
      values
    ),
  ]);

  return {
    assets: assetResult.rows as Asset[],
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

export async function getAssetById(id: string): Promise<Asset | null> {
  await ensureMigrated();
  const result = await sql`SELECT * FROM assets WHERE id = ${id}`;
  return result.rows[0] as Asset ?? null;
}

export async function createAsset(data: {
  filename: string;
  title: string;
  description?: string;
  file_url: string;
  blob_pathname: string;
  file_type: FileType;
  mime_type?: string;
  file_size_kb?: number;
  width_px?: number;
  height_px?: number;
  tags?: string[];
  products?: string[];
  product?: string;
  collection?: string;
  uploaded_by?: string;
  status?: AssetStatus;
}): Promise<Asset> {
  const {
    filename,
    title,
    description = null,
    file_url,
    blob_pathname,
    file_type,
    mime_type = null,
    file_size_kb = null,
    width_px = null,
    height_px = null,
    tags = [],
    products,
    product = null,
    collection = null,
    uploaded_by = null,
    status = "draft",
  } = data;

  const resolvedProducts = products && products.length > 0
    ? Array.from(new Set(products))
    : product
      ? [product]
      : [];
  const primaryProduct = resolvedProducts[0] ?? null;

  await ensureMigrated();
  const result = await sql.query(
    `INSERT INTO assets (filename, title, description, file_url, blob_pathname, file_type, mime_type, file_size_kb, width_px, height_px, tags, product, products, collection, uploaded_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [filename, title, description, file_url, blob_pathname, file_type, mime_type, file_size_kb, width_px, height_px, tags, primaryProduct, resolvedProducts, collection, uploaded_by, status]
  );
  return result.rows[0] as Asset;
}

export async function updateAsset(
  id: string,
  data: Partial<Pick<Asset, "title" | "description" | "tags" | "status" | "products" | "product" | "collection" | "file_url" | "file_size_kb" | "width_px" | "height_px">>
): Promise<Asset | null> {
  await ensureMigrated();
  const payload: Record<string, unknown> = { ...data };

  if (Array.isArray(payload.products)) {
    const normalizedProducts = Array.from(new Set(payload.products as string[]));
    payload.products = normalizedProducts;
    payload.product = normalizedProducts[0] ?? null;
  } else if ("product" in payload && typeof payload.product === "string") {
    payload.products = [payload.product];
  } else if (payload.product === null) {
    payload.products = [];
  }

  const fields = Object.keys(payload);
  if (fields.length === 0) return getAssetById(id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [];
  const setClauses: string[] = [];
  let idx = 1;

  for (const field of fields) {
    setClauses.push(`${field} = $${idx}`);
    values.push(payload[field]);
    idx++;
  }
  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE assets SET ${setClauses.join(", ")}
    WHERE id = $${idx}
    RETURNING *
  `;

  const result = await sql.query(query, values);
  return result.rows[0] as Asset ?? null;
}

export async function updateAssetTags(
  id: string,
  data: { tags: string[]; aiTags: string[] }
): Promise<void> {
  await ensureMigrated();
  await sql.query(
    `
      UPDATE assets
      SET
        tags = $1,
        ai_tags = $2,
        ai_tagged_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
    `,
    [data.tags, data.aiTags, id]
  );
}

export async function listAssets(params: {
  product?: string;
  status?: AssetStatus;
  file_type?: FileType;
  collection?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<Asset[]> {
  return searchAssets(params);
}

export async function listCollectionSummaries(): Promise<CollectionSummary[]> {
  await ensureMigrated();
  const result = await sql.query(`
    SELECT
      collection AS name,
      COUNT(*)::int AS count,
      (
        ARRAY_AGG(file_url ORDER BY created_at DESC)
        FILTER (WHERE file_type = 'image')
      )[1] AS preview_url,
      (
        ARRAY_AGG(title ORDER BY created_at DESC)
      )[1] AS latest_title
    FROM assets
    WHERE collection IS NOT NULL
    GROUP BY collection
    ORDER BY collection ASC
  `);

  return result.rows as CollectionSummary[];
}
