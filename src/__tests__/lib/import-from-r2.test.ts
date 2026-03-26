import {
  BASE_PREFIX,
  buildImportRecord,
  detectCollection,
  detectContentType,
  detectFileType,
  detectProducts,
  parseImportArgs,
} from "@/lib/import-from-r2";

describe("import-from-r2 helpers", () => {
  it("parses dry-run, limit, and collection flags", () => {
    expect(parseImportArgs(["--dry-run", "--limit", "25", "--collection", "Products"])).toEqual({
      dryRun: true,
      limit: 25,
      collection: "Products",
    });
  });

  it("detects collection and multiple products from the folder path", () => {
    const key = `${BASE_PREFIX}Products/Product A + Product B/hero-shot.jpg`;

    expect(detectCollection(key)).toBe("Products");
    expect(detectProducts(key)).toEqual(["Product A", "Product B"]);
  });

  it("matches configured collections even when folder names include emoji prefixes", () => {
    expect(detectCollection(`${BASE_PREFIX}📈 Marketing/campaign.jpg`)).toBe("Marketing");
    expect(detectCollection(`${BASE_PREFIX}✨ Brand/logo-pack.svg`)).toBe("Brand");
  });

  it("detects content types and file types from naming patterns", () => {
    expect(detectFileType(`${BASE_PREFIX}Marketing/UGC/demo-video.mp4`)).toBe("video");
    expect(detectContentType(`${BASE_PREFIX}Marketing/UGC/demo-video.mp4`)).toBe("UGC");
    expect(detectContentType(`${BASE_PREFIX}Brand/logo-pack.svg`)).toBe("Logo");
    expect(detectContentType(`${BASE_PREFIX}Products/Product A/lifestyle-kitchen.jpg`)).toBe("Lifestyle");
  });

  it("builds an import record with normalized multi-product metadata", () => {
    const record = buildImportRecord(
      {
        key: `${BASE_PREFIX}Products/Product A Product B/product_a-product_b-hero-shot.jpg`,
        size: 4096,
      },
      "https://pub.example.com"
    );

    expect(record.title).toBe("product a product b hero shot");
    expect(record.products).toEqual(["Product A", "Product B"]);
    expect(record.collection).toBe("Products");
    expect(record.file_type).toBe("image");
    expect(record.tags).toEqual([
      "Products",
      "Product A",
      "Product B",
      "Product shot",
    ]);
    expect(record.file_url).toBe(
      "https://pub.example.com/raw-backup/dash-export-03-03-2026/Products/Product A Product B/product_a-product_b-hero-shot.jpg"
    );
  });
});
