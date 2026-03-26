import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssetDetailView from "@/components/AssetDetailView";
import type { Asset } from "@/lib/db";

const mockAsset: Asset = {
  id: "asset-1",
  filename: "hero.jpg",
  title: "Hero Image",
  description: "Original description",
  file_url: "https://cdn.example.com/hero.jpg",
  blob_pathname: "uploads/hero.jpg",
  file_type: "image",
  mime_type: "image/jpeg",
  file_size_kb: 250,
  width_px: 1600,
  height_px: 900,
  tags: ["hero", "launch"],
  ai_tags: [],
  ai_tagged_at: null,
  products: ["Self Journal", "Bundle"],
  product: "Self Journal",
  collection: "Products",
  status: "draft",
  uploaded_by: "team-ui",
  created_at: "2026-03-01T10:00:00.000Z",
  updated_at: "2026-03-01T10:00:00.000Z",
};

describe("AssetDetailView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  it("renders preview, metadata, and download action", () => {
    render(<AssetDetailView initialAsset={mockAsset} />);

    expect(screen.getByRole("img", { name: "Hero Image" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Download Original" })
    ).toHaveAttribute("href", "https://cdn.example.com/hero.jpg");
    expect(screen.getByText("team-ui")).toBeInTheDocument();
  });

  it("saves edited asset fields", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        asset: {
          ...mockAsset,
          title: "Updated Hero Image",
          description: "Updated description",
          tags: ["hero", "updated"],
          status: "approved",
        },
      }),
    });

    render(<AssetDetailView initialAsset={mockAsset} />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Updated Hero Image" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Updated description" },
    });
    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "hero, updated" },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "approved" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/assets/asset-1",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-api-key": expect.any(String),
        }),
      })
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/assets/asset-1",
      expect.objectContaining({
        body: JSON.stringify({
          title: "Updated Hero Image",
          description: "Updated description",
          tags: ["hero", "updated"],
          products: ["Self Journal", "Bundle"],
          status: "approved",
        }),
      })
    );

    await waitFor(() =>
      expect(screen.getByText("Asset details saved.")).toBeInTheDocument()
    );
  });

  it("archives the asset via soft delete", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        asset: {
          ...mockAsset,
          status: "archived",
        },
      }),
    });

    render(<AssetDetailView initialAsset={mockAsset} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive Asset" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/assets/asset-1",
        expect.objectContaining({
          body: JSON.stringify({ status: "archived" }),
        })
      )
    );

    await waitFor(() =>
      expect(screen.getByText("Asset archived.")).toBeInTheDocument()
    );
  });
});
