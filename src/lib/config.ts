function parseStringArrayEnv(
  raw: string | undefined,
  fallback: string[]
): string[] {
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const values = parsed.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      );
      return values.length > 0 ? values : fallback;
    }
  } catch {
    const values = raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length > 0) {
      return values;
    }
  }

  return fallback;
}

export const publicConfig = {
  appName:
    process.env.NEXT_PUBLIC_APP_NAME ||
    process.env.NEXT_PUBLIC_SHELF_APP_NAME ||
    "Shelf",
  appEmoji:
    process.env.NEXT_PUBLIC_APP_EMOJI ||
    process.env.NEXT_PUBLIC_SHELF_APP_EMOJI ||
    "📦",
  appDescription:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    process.env.NEXT_PUBLIC_SHELF_APP_DESCRIPTION ||
    "Self-hosted digital asset management with AI auto-tagging",
  products: parseStringArrayEnv(
    process.env.NEXT_PUBLIC_SHELF_PRODUCTS,
    ["Product A", "Product B", "Product C"]
  ),
  contentTypes: parseStringArrayEnv(
    process.env.NEXT_PUBLIC_SHELF_CONTENT_TYPES,
    [
      "Product shot",
      "Lifestyle",
      "Flat lay",
      "Banner",
      "Social media",
      "Video",
      "UGC",
      "Logo",
    ]
  ),
  collections: parseStringArrayEnv(
    process.env.NEXT_PUBLIC_SHELF_COLLECTIONS,
    ["Products", "Marketing", "Brand"]
  ),
} as const;

export const serverConfig = {
  authUsername: process.env.SHELF_AUTH_USERNAME || "admin",
  r2Bucket: process.env.R2_BUCKET || "shelf-dam",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  geminiPromptPrefix:
    process.env.GEMINI_PROMPT_PREFIX || "You are a digital asset manager.",
  geminiPromptContext: process.env.GEMINI_PROMPT_CONTEXT || "",
  importPrefix:
    process.env.SHELF_IMPORT_PREFIX || "raw-backup/dash-export-03-03-2026/",
  importUploadedBy: process.env.SHELF_IMPORT_UPLOADED_BY || "import",
} as const;

export const config = {
  ...publicConfig,
  ...serverConfig,
} as const;
