import { sql } from "@vercel/postgres";
import { CONTENT_TYPES, COLLECTIONS, PRODUCTS } from "./constants";
import { titleFromFilename } from "./asset-utils";
import { serverConfig } from "@/lib/config";

export const BASE_PREFIX = serverConfig.importPrefix;
const RAW_EXTENSIONS = new Set(["arw", "cr2", "cr3", "dng", "nef", "orf", "psd", "raf", "rw2"]);
const VIDEO_EXTENSIONS = new Set(["avi", "m4v", "mov", "mp4", "mpeg", "mpg", "webm"]);
const IMAGE_EXTENSIONS = new Set(["avif", "gif", "heic", "jpeg", "jpg", "png", "svg", "webp"]);
const PDF_EXTENSIONS = new Set(["pdf"]);

function normalizeSegment(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

const COLLECTION_LOOKUP = new Map(
  COLLECTIONS.map((collection) => [normalizeSegment(collection), collection])
);

function findConfiguredContentType(...candidates: string[]): string | null {
  const exact = new Map(
    CONTENT_TYPES.map((contentType) => [normalizeSegment(contentType), contentType])
  );

  for (const candidate of candidates) {
    const directMatch = exact.get(normalizeSegment(candidate));
    if (directMatch) return directMatch;
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeSegment(candidate);
    const fuzzyMatch = CONTENT_TYPES.find((contentType) => {
      const normalizedContentType = normalizeSegment(contentType);
      return (
        normalizedContentType.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedContentType)
      );
    });

    if (fuzzyMatch) return fuzzyMatch;
  }

  return null;
}

export interface R2Object {
  key: string;
  size: number;
  uploaded?: string;
}

export interface ImportAssetRecord {
  filename: string;
  title: string;
  description: string | null;
  file_url: string;
  blob_pathname: string;
  file_type: "image" | "video" | "pdf" | "raw" | "other";
  mime_type: string | null;
  file_size_kb: number;
  width_px: null;
  height_px: null;
  tags: string[];
  products: string[];
  collection: string | null;
  uploaded_by: string;
  status: "approved";
}

export interface ImportOptions {
  prefix?: string;
  dryRun: boolean;
  limit?: number;
  collection?: string;
  pageSize?: number;
}

export interface ImportSummary {
  discovered: number;
  imported: number;
  skipped: number;
  dryRun: boolean;
}

export function parseImportArgs(args: string[]): ImportOptions {
  let dryRun = false;
  let limit: number | undefined;
  let collection: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (value === "--limit") {
      const parsedLimit = Number.parseInt(args[index + 1] ?? "", 10);
      limit = Number.isNaN(parsedLimit) ? undefined : parsedLimit;
      index += 1;
      continue;
    }

    if (value === "--collection") {
      collection = args[index + 1];
      index += 1;
    }
  }

  return { dryRun, limit, collection };
}

export function detectCollection(key: string): string | null {
  if (!key.startsWith(BASE_PREFIX)) return null;
  const relativePath = key.slice(BASE_PREFIX.length);
  const [topLevel] = relativePath.split("/");
  const normalizedTopLevel = topLevel ? normalizeSegment(topLevel) : "";

  if (!normalizedTopLevel) return null;

  return COLLECTION_LOOKUP.get(normalizedTopLevel) ?? null;
}

export function detectProducts(key: string): string[] {
  const normalized = normalizeSegment(key.replace(BASE_PREFIX, ""));
  return PRODUCTS.filter((product) => normalized.includes(normalizeSegment(product)));
}

export function detectProduct(key: string): string | null {
  return detectProducts(key)[0] ?? null;
}

export function getFileExtension(key: string): string {
  const filename = key.split("/").pop() ?? key;
  const extension = filename.split(".").pop();
  return extension ? extension.toLowerCase() : "";
}

export function detectFileType(key: string): ImportAssetRecord["file_type"] {
  const extension = getFileExtension(key);
  if (RAW_EXTENSIONS.has(extension)) return "raw";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (PDF_EXTENSIONS.has(extension)) return "pdf";
  return "other";
}

export function detectMimeType(key: string): string | null {
  const extension = getFileExtension(key);

  if (["jpg", "jpeg"].includes(extension)) return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "mp4" || extension === "m4v") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "avi") return "video/x-msvideo";
  if (extension === "webm") return "video/webm";
  if (extension === "pdf") return "application/pdf";
  if (RAW_EXTENSIONS.has(extension)) return "application/octet-stream";

  return null;
}

export function detectContentType(key: string): string | null {
  const normalized = key.replace(BASE_PREFIX, "").toLowerCase();
  const fileType = detectFileType(key);

  if (/branding|brand-guide|logo|wordmark|palette|typography/.test(normalized)) {
    return findConfiguredContentType("Logo", "Branding");
  }

  if (/display|banner|paid|meta[-_ ]ad|google[-_ ]ad/.test(normalized)) {
    return findConfiguredContentType("Banner", "Social media");
  }

  if (/raw|bts|behind[-_ ]the[-_ ]scenes|uncut/.test(normalized) || fileType === "raw") {
    return findConfiguredContentType("Video");
  }

  if (/ugc|creator|testimonial|review/.test(normalized)) {
    return fileType === "video"
      ? findConfiguredContentType("UGC", "Video")
      : findConfiguredContentType("UGC", "Social media");
  }

  if (/social|instagram|tiktok|reel|story|carousel/.test(normalized)) {
    return findConfiguredContentType("Social media", "UGC");
  }

  if (/video|demo|walkthrough|how[-_ ]to/.test(normalized) && fileType === "video") {
    return findConfiguredContentType("Video");
  }

  if (/lifestyle|in[-_ ]use|on[-_ ]model|outdoor|kitchen|desk/.test(normalized)) {
    return findConfiguredContentType("Lifestyle");
  }

  if (/flat[-_ ]lay/.test(normalized)) {
    return findConfiguredContentType("Flat lay", "Product shot");
  }

  if (/product|packshot|studio|hero|flat[-_ ]lay/.test(normalized)) {
    return findConfiguredContentType("Product shot");
  }

  if (fileType === "video") return findConfiguredContentType("Video");
  if (fileType === "image") return findConfiguredContentType("Product shot");
  return null;
}

export function buildImportRecord(
  object: R2Object,
  publicUrl: string
): ImportAssetRecord {
  const filename = object.key.split("/").pop() ?? object.key;
  const products = detectProducts(object.key);
  const collection = detectCollection(object.key);
  const contentType = detectContentType(object.key);
  const tags = Array.from(
    new Set([collection, ...products, contentType].filter(Boolean) as string[])
  );

  return {
    filename,
    title: titleFromFilename(filename),
    description: null,
    file_url: `${publicUrl.replace(/\/$/, "")}/${object.key}`,
    blob_pathname: object.key,
    file_type: detectFileType(object.key),
    mime_type: detectMimeType(object.key),
    file_size_kb: Math.max(1, Math.round(object.size / 1024)),
    width_px: null,
    height_px: null,
    tags,
    products,
    collection,
    uploaded_by: serverConfig.importUploadedBy,
    status: "approved",
  };
}

export async function listR2Objects({
  prefix = BASE_PREFIX,
  limit,
  collection,
  pageSize = 1000,
}: ImportOptions): Promise<R2Object[]> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const token = process.env.R2_TOKEN;

  if (!accountId || !bucket || !token) {
    throw new Error("Missing R2_ACCOUNT_ID, R2_BUCKET, or R2_TOKEN.");
  }

  const scopedPrefix = collection ? `${prefix}${collection}/` : prefix;
  const objects: R2Object[] = [];
  let cursor: string | null = null;

  do {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects`
    );
    url.searchParams.set("prefix", scopedPrefix);
    url.searchParams.set("limit", String(pageSize));

    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`R2 list failed: ${response.status} ${text}`);
    }

    const payload = JSON.parse(text) as {
      result?: {
        objects?: Array<{ key: string; size?: number; uploaded?: string }>;
        cursor?: string | null;
        truncated?: boolean;
      } | Array<{ key: string; size?: number; uploaded?: string }>;
    };

    const result = payload.result;
    const page = Array.isArray(result) ? result : result?.objects ?? [];

    objects.push(
      ...page
        .filter((item) => item.key && !item.key.endsWith("/"))
        .map((item) => ({
          key: item.key,
          size: item.size ?? 0,
          uploaded: item.uploaded,
        }))
    );

    if (limit && objects.length >= limit) {
      return objects.slice(0, limit);
    }

    cursor = Array.isArray(result) ? null : result?.cursor ?? null;
  } while (cursor);

  return objects;
}

export async function fetchExistingBlobPaths(paths: string[]): Promise<Set<string>> {
  if (paths.length === 0) return new Set();

  const result = await sql.query(
    "SELECT blob_pathname FROM assets WHERE blob_pathname = ANY($1::text[])",
    [paths]
  );

  return new Set(result.rows.map((row) => row.blob_pathname as string));
}

export async function insertAssetBatch(records: ImportAssetRecord[]): Promise<number> {
  if (records.length === 0) return 0;

  const client = await sql.connect();
  const values: unknown[] = [];
  const placeholders = records.map((record, recordIndex) => {
    const baseIndex = recordIndex * 16;
    values.push(
      record.filename,
      record.title,
      record.description,
      record.file_url,
      record.blob_pathname,
      record.file_type,
      record.mime_type,
      record.file_size_kb,
      record.width_px,
      record.height_px,
      record.tags,
      record.products[0] ?? null,
      record.products,
      record.collection,
      record.uploaded_by,
      record.status
    );

    return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15}, $${baseIndex + 16})`;
  });

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO assets (
        filename,
        title,
        description,
        file_url,
        blob_pathname,
        file_type,
        mime_type,
        file_size_kb,
        width_px,
        height_px,
        tags,
        product,
        products,
        collection,
        uploaded_by,
        status
      ) VALUES ${placeholders.join(", ")}`,
      values
    );
    await client.query("COMMIT");
    return records.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function runImport(options: ImportOptions): Promise<ImportSummary> {
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!publicUrl) {
    throw new Error("Missing R2_PUBLIC_URL.");
  }

  const objects = await listR2Objects(options);
  let imported = 0;
  let skipped = 0;

  for (let index = 0; index < objects.length; index += 50) {
    const batch = objects.slice(index, index + 50);
    const existing = await fetchExistingBlobPaths(batch.map((item) => item.key));
    const records = batch
      .filter((item) => !existing.has(item.key))
      .map((item) => buildImportRecord(item, publicUrl));

    skipped += batch.length - records.length;

    if (options.dryRun) {
      imported += records.length;
      continue;
    }

    imported += await insertAssetBatch(records);
  }

  return {
    discovered: objects.length,
    imported,
    skipped,
    dryRun: options.dryRun,
  };
}
