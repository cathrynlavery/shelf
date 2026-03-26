export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export function buildAssetTags({
  rawTags = "",
  products = [],
  contentType,
}: {
  rawTags?: string;
  products?: string[];
  contentType?: string;
}): string[] {
  const tags = parseTagInput(rawTags);

  return uniqueStrings([
    ...tags,
    ...products,
    ...(contentType ? [contentType] : []),
  ]);
}

export function parseTagInput(rawTags: string): string[] {
  return uniqueStrings(rawTags.split(","));
}

export function parseProductsInput(rawProducts?: string | string[] | null): string[] {
  if (!rawProducts) {
    return [];
  }

  if (Array.isArray(rawProducts)) {
    return uniqueStrings(rawProducts);
  }

  const trimmed = rawProducts.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return uniqueStrings(parsed.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      // Fall through to comma-separated parsing.
    }
  }

  return uniqueStrings(trimmed.split(","));
}

export function toggleStringSelection(values: string[], value: string): string[] {
  if (values.includes(value)) {
    return values.filter((entry) => entry !== value);
  }

  return [...values, value];
}

export function formatFileSize(fileSizeKb: number | null): string {
  if (fileSizeKb === null) return "Unknown";
  if (fileSizeKb < 1024) return `${fileSizeKb} KB`;
  return `${(fileSizeKb / 1024).toFixed(1)} MB`;
}

export function formatDimensions(widthPx: number | null, heightPx: number | null): string {
  if (!widthPx || !heightPx) return "Unknown";
  return `${widthPx} × ${heightPx}`;
}
