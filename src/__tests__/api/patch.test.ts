/**
 * Tests for PATCH /api/assets/[id]
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  getAssetById: jest.fn(),
  updateAsset: jest.fn(),
}));

import { PATCH } from "@/app/api/assets/[id]/route";
import { updateAsset } from "@/lib/db";

const VALID_API_KEY = "test-api-key-patch";

function makeRequest(id: string, body: object, apiKey?: string): NextRequest {
  return new NextRequest(`http://localhost/api/assets/${id}`, {
    method: "PATCH",
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

describe("PATCH /api/assets/[id]", () => {
  it("rejects missing API key", async () => {
    const req = makeRequest("uuid-1", { tags: ["test"] });
    const res = await PATCH(req, { params: { id: "uuid-1" } });
    expect(res.status).toBe(401);
  });

  it("rejects invalid API key", async () => {
    const req = makeRequest("uuid-1", { tags: ["test"] }, "bad-key");
    const res = await PATCH(req, { params: { id: "uuid-1" } });
    expect(res.status).toBe(401);
  });

  it("updates tags correctly", async () => {
    const updatedAsset = {
      id: "uuid-1",
      filename: "sj-hero.jpg",
      title: "Product A Hero",
      tags: ["Product A", "hero", "approved-2024"],
      products: ["Product A", "Product B"],
      status: "approved",
      file_url: "https://blob.vercel.com/sj-hero.jpg",
      blob_pathname: "uploads/sj-hero.jpg",
      file_type: "image",
      product: "Product A",
      collection: "Products",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      description: null,
      mime_type: "image/jpeg",
      file_size_kb: 250,
      width_px: 1200,
      height_px: 800,
      uploaded_by: null,
    };

    (updateAsset as jest.Mock).mockResolvedValue(updatedAsset);

    const req = makeRequest(
      "uuid-1",
      { tags: ["Product A", "hero", "approved-2024"] },
      VALID_API_KEY
    );
    const res = await PATCH(req, { params: { id: "uuid-1" } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.asset.tags).toEqual(["Product A", "hero", "approved-2024"]);

    expect(updateAsset).toHaveBeenCalledWith(
      "uuid-1",
      expect.objectContaining({ tags: ["Product A", "hero", "approved-2024"] })
    );
  });

  it("updates status correctly", async () => {
    const updatedAsset = {
      id: "uuid-1",
      filename: "sj-hero.jpg",
      title: "Product A Hero",
      tags: [],
      products: ["Product A"],
      status: "approved",
      file_url: "https://blob.vercel.com/sj-hero.jpg",
      blob_pathname: "uploads/sj-hero.jpg",
      file_type: "image",
      product: "Product A",
      collection: "Products",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      description: null,
      mime_type: null,
      file_size_kb: null,
      width_px: null,
      height_px: null,
      uploaded_by: null,
    };

    (updateAsset as jest.Mock).mockResolvedValue(updatedAsset);

    const req = makeRequest("uuid-1", { status: "approved" }, VALID_API_KEY);
    const res = await PATCH(req, { params: { id: "uuid-1" } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.asset.status).toBe("approved");
  });

  it("updates products correctly", async () => {
    const updatedAsset = {
      id: "uuid-1",
      filename: "sj-hero.jpg",
      title: "Product A Hero",
      tags: ["hero"],
      products: ["Product A", "Product C"],
      status: "approved",
      file_url: "https://blob.vercel.com/sj-hero.jpg",
      blob_pathname: "uploads/sj-hero.jpg",
      file_type: "image",
      product: "Product A",
      collection: "Products",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      description: null,
      mime_type: null,
      file_size_kb: null,
      width_px: null,
      height_px: null,
      uploaded_by: null,
    };

    (updateAsset as jest.Mock).mockResolvedValue(updatedAsset);

    const req = makeRequest(
      "uuid-1",
      { products: ["Product A", "Product C"] },
      VALID_API_KEY
    );
    const res = await PATCH(req, { params: { id: "uuid-1" } });

    expect(res.status).toBe(200);
    expect(updateAsset).toHaveBeenCalledWith(
      "uuid-1",
      expect.objectContaining({ products: ["Product A", "Product C"] })
    );
  });

  it("returns 404 if asset not found", async () => {
    (updateAsset as jest.Mock).mockResolvedValue(null);

    const req = makeRequest("nonexistent-id", { status: "approved" }, VALID_API_KEY);
    const res = await PATCH(req, { params: { id: "nonexistent-id" } });
    expect(res.status).toBe(404);
  });

  it("returns 400 if no valid fields provided", async () => {
    const req = makeRequest("uuid-1", {}, VALID_API_KEY);
    const res = await PATCH(req, { params: { id: "uuid-1" } });
    expect(res.status).toBe(400);
  });
});
