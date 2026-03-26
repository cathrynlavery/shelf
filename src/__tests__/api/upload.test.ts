/**
 * Tests for POST /api/assets/upload
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  createAsset: jest.fn(),
  updateAssetTags: jest.fn(),
}));

jest.mock("@/lib/r2", () => ({
  uploadToR2: jest.fn().mockResolvedValue("https://pub-test.r2.dev/uploads/123-test.jpg"),
}));

jest.mock("@/lib/gemini-tagger", () => ({
  tagImageWithGemini: jest.fn(),
}));

import { POST } from "@/app/api/assets/upload/route";
import { createAsset, updateAssetTags } from "@/lib/db";
import { tagImageWithGemini } from "@/lib/gemini-tagger";

const VALID_API_KEY = "test-api-key-upload";

function makeFormRequest(fields: Record<string, string>, apiKey?: string, hasFile = true): NextRequest {
  const form = new FormData();
  if (hasFile) {
    const file = new File(["fake content"], fields.filename ?? "test.jpg", {
      type: fields.mime_type ?? "image/jpeg",
    });
    form.append("file", file);
  }
  Object.entries(fields).forEach(([k, v]) => {
    if (k !== "filename" && k !== "mime_type") form.append(k, v);
  });

  return new NextRequest("http://localhost/api/assets/upload", {
    method: "POST",
    headers: {
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: form,
  });
}

beforeEach(() => {
  process.env.API_KEY = VALID_API_KEY;
  process.env.R2_TOKEN = "mock-r2-token";
  process.env.R2_ACCOUNT_ID = "mock-account";
  process.env.R2_BUCKET = "shelf-dam";
  process.env.R2_PUBLIC_URL = "https://pub-test.r2.dev";
  process.env.GEMINI_API_KEY = "gemini-key";
  jest.clearAllMocks();
  (tagImageWithGemini as jest.Mock).mockResolvedValue(null);
});

describe("POST /api/assets/upload", () => {
  it("rejects missing API key", async () => {
    const req = makeFormRequest({ filename: "test.jpg", title: "Test" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects invalid API key", async () => {
    const req = makeFormRequest({ filename: "test.jpg", title: "Test" }, "bad-key");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if file is missing", async () => {
    const req = makeFormRequest({ filename: "test.jpg", title: "Test" }, VALID_API_KEY, false);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if title is missing", async () => {
    const req = makeFormRequest({ filename: "test.jpg" }, VALID_API_KEY);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("uploads to R2 and creates DB record", async () => {
    const mockAsset = {
      id: "uuid-upload-1",
      filename: "sj-hero.jpg",
      title: "Product A Hero Shot",
      tags: ["Product A", "hero"],
      products: ["Product A", "Product B"],
      file_type: "image",
      status: "draft",
      file_url: "https://pub-test.r2.dev/uploads/123-sj-hero.jpg",
      blob_pathname: "uploads/123-sj-hero.jpg",
      product: "Product A",
      collection: "Products",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      description: null,
      mime_type: "image/jpeg",
      file_size_kb: 0,
      width_px: null,
      height_px: null,
      uploaded_by: "team-ui",
    };

    (createAsset as jest.Mock).mockResolvedValue(mockAsset);

    const req = makeFormRequest(
      {
        filename: "sj-hero.jpg",
        title: "Product A Hero Shot",
        tags: '["Product A","hero"]',
        products: '["Product A","Product B"]',
        mime_type: "image/jpeg",
        uploaded_by: "team-ui",
      },
      VALID_API_KEY
    );

    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.asset.id).toBe("uuid-upload-1");
    expect(body.asset.file_url).toContain("r2.dev");

    expect(createAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "sj-hero.jpg",
        title: "Product A Hero Shot",
        file_type: "image",
        products: ["Product A", "Product B"],
        mime_type: "image/jpeg",
      })
    );
  });

  it("starts Gemini auto-tagging for image uploads", async () => {
    const mockAsset = {
      id: "uuid-upload-2",
      filename: "sj-hero.jpg",
      title: "Product A Hero Shot",
      tags: ["Product A"],
      products: ["Product A"],
      file_type: "image",
      status: "draft",
      file_url: "https://pub-test.r2.dev/uploads/123-sj-hero.jpg",
      blob_pathname: "uploads/123-sj-hero.jpg",
      product: "Product A",
      collection: "Products",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      description: null,
      mime_type: "image/jpeg",
      file_size_kb: 0,
      width_px: null,
      height_px: null,
      uploaded_by: "team-ui",
    };

    (createAsset as jest.Mock).mockResolvedValue(mockAsset);
    (tagImageWithGemini as jest.Mock).mockResolvedValue({
      tags: ["hero", "minimal", "Product A"],
      product: "Product A",
      description: "A clean product shot.",
    });

    const req = makeFormRequest(
      {
        filename: "sj-hero.jpg",
        title: "Product A Hero Shot",
        tags: '["Product A"]',
        products: '["Product A"]',
        mime_type: "image/jpeg",
        uploaded_by: "team-ui",
      },
      VALID_API_KEY
    );

    const response = await POST(req);
    await new Promise((resolve) => setImmediate(resolve));

    expect(response.status).toBe(201);
    expect(tagImageWithGemini).toHaveBeenCalledWith(
      "https://pub-test.r2.dev/uploads/123-test.jpg",
      "image/jpeg"
    );
    expect(updateAssetTags).toHaveBeenCalledWith("uuid-upload-2", {
      tags: ["Product A", "hero", "minimal"],
      aiTags: ["hero", "minimal", "Product A"],
    });
  });

  it("accepts comma-separated products", async () => {
    (createAsset as jest.Mock).mockResolvedValue({
      id: "uuid-upload-3",
      filename: "bundle.jpg",
      title: "Product C Hero",
      tags: [],
      products: ["Product A", "Product C"],
      file_type: "image",
      status: "draft",
      file_url: "https://pub-test.r2.dev/uploads/123-bundle.jpg",
      blob_pathname: "uploads/123-bundle.jpg",
      product: "Product A",
      collection: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      description: null,
      mime_type: "image/jpeg",
      file_size_kb: 0,
      width_px: null,
      height_px: null,
      uploaded_by: "team-ui",
    });

    const req = makeFormRequest(
      {
        filename: "bundle.jpg",
        title: "Product C Hero",
        products: "Product A, Product C",
        mime_type: "image/jpeg",
      },
      VALID_API_KEY
    );

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(createAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        products: ["Product A", "Product C"],
      })
    );
  });

  it("correctly infers file_type for video", async () => {
    const mockAsset = {
      id: "uuid-video",
      filename: "demo.mp4",
      title: "Demo Video",
      tags: [],
      products: [],
      file_type: "video",
      status: "draft",
      file_url: "https://pub-test.r2.dev/uploads/123-demo.mp4",
      blob_pathname: "uploads/123-demo.mp4",
      product: null,
      collection: "Marketing",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      description: null,
      mime_type: "video/mp4",
      file_size_kb: 0,
      width_px: null,
      height_px: null,
      uploaded_by: null,
    };

    (createAsset as jest.Mock).mockResolvedValue(mockAsset);

    const req = makeFormRequest(
      { filename: "demo.mp4", title: "Demo Video", mime_type: "video/mp4" },
      VALID_API_KEY
    );

    await POST(req);

    expect(createAsset).toHaveBeenCalledWith(
      expect.objectContaining({ file_type: "video" })
    );
    expect(tagImageWithGemini).not.toHaveBeenCalled();
    expect(updateAssetTags).not.toHaveBeenCalled();
  });
});
