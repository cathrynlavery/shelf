/**
 * Tests for POST /api/assets/search
 * @jest-environment node
 */
import { NextRequest } from "next/server";

// Mock the DB module
jest.mock("@/lib/db", () => ({
  searchAssetsPage: jest.fn(),
}));

import { POST } from "@/app/api/assets/search/route";
import { searchAssetsPage } from "@/lib/db";

const VALID_API_KEY = "test-api-key-123";

function makeRequest(body: object, apiKey?: string): NextRequest {
  return new NextRequest("http://localhost/api/assets/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.API_KEY = VALID_API_KEY;
  jest.clearAllMocks();
});

describe("POST /api/assets/search", () => {
  it("rejects requests with missing API key", async () => {
    const req = makeRequest({ tags: ["Self Journal"] });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("rejects requests with invalid API key", async () => {
    const req = makeRequest({ tags: ["Self Journal"] }, "wrong-key");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns filtered results by tag", async () => {
    const mockAssets = [
      {
        id: "uuid-1",
        filename: "sj-hero.jpg",
        title: "Self Journal Hero",
        tags: ["Self Journal", "hero"],
        products: ["Self Journal"],
        file_type: "image",
        status: "approved",
        file_url: "https://blob.vercel.com/sj-hero.jpg",
        product: "Self Journal",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        blob_pathname: "uploads/sj-hero.jpg",
        description: null,
        mime_type: "image/jpeg",
        file_size_kb: 250,
        width_px: 1200,
        height_px: 800,
        uploaded_by: null,
        collection: "Products",
      },
    ];

    (searchAssetsPage as jest.Mock).mockResolvedValue({
      assets: mockAssets,
      total: mockAssets.length,
    });
    (searchAssetsPage as jest.Mock).mockResolvedValue({ assets: mockAssets, total: 1 });

    const req = makeRequest({ tags: ["Self Journal"] }, VALID_API_KEY);
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0].title).toBe("Self Journal Hero");
    expect(body.count).toBe(1);

    expect(searchAssetsPage).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["Self Journal"] })
    );
  });

  it("returns filtered results by product + file_type", async () => {
    const mockAssets = [
      {
        id: "uuid-2",
        filename: "helm-video.mp4",
        title: "Helm Focus Product Video",
        tags: ["Helm Focus"],
        products: ["Helm Focus", "Bundle"],
        file_type: "video",
        status: "approved",
        file_url: "https://blob.vercel.com/helm-video.mp4",
        product: "Helm Focus",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        blob_pathname: "uploads/helm-video.mp4",
        description: null,
        mime_type: "video/mp4",
        file_size_kb: 5000,
        width_px: null,
        height_px: null,
        uploaded_by: null,
        collection: "Marketing",
      },
    ];

    (searchAssetsPage as jest.Mock).mockResolvedValue({
      assets: mockAssets,
      total: mockAssets.length,
    });
    (searchAssetsPage as jest.Mock).mockResolvedValue({ assets: mockAssets, total: 1 });

    const req = makeRequest(
      { product: "Helm Focus", file_type: "video" },
      VALID_API_KEY
    );
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0].file_type).toBe("video");
    expect(body.assets[0].products).toEqual(["Helm Focus", "Bundle"]);

    expect(searchAssetsPage).toHaveBeenCalledWith(
      expect.objectContaining({ product: "Helm Focus", file_type: "video" })
    );
  });

  it("passes collection filters through to the db layer", async () => {
    (searchAssetsPage as jest.Mock).mockResolvedValue({ assets: [], total: 0 });

    const req = makeRequest(
      { collection: "Products", status: "approved" },
      VALID_API_KEY
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(searchAssetsPage).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "Products", status: "approved" })
    );
  });

  it("passes full-text search terms through to the db layer", async () => {
    (searchAssetsPage as jest.Mock).mockResolvedValue({ assets: [], total: 0 });

    const req = makeRequest(
      { q: "hero shot", collection: "Products" },
      VALID_API_KEY
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(searchAssetsPage).toHaveBeenCalledWith(
      expect.objectContaining({ query: "hero shot", collection: "Products" })
    );
  });

  it("returns empty array when no assets match", async () => {
    (searchAssetsPage as jest.Mock).mockResolvedValue({ assets: [], total: 0 });

    const req = makeRequest(
      { tags: ["nonexistent-tag"], status: "approved" },
      VALID_API_KEY
    );
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.assets).toEqual([]);
    expect(body.count).toBe(0);
  });

  it("handles DB errors gracefully", async () => {
    (searchAssetsPage as jest.Mock).mockRejectedValue(new Error("DB connection failed"));

    const req = makeRequest({ tags: ["Self Journal"] }, VALID_API_KEY);
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
