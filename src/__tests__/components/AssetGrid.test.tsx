/**
 * Tests for AssetGrid component
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import AssetGrid from "@/components/AssetGrid";
import type { Asset } from "@/lib/db";

const mockAssets: Asset[] = [
  {
    id: "uuid-1",
    filename: "sj-hero.jpg",
    title: "Product A Hero Shot",
    description: null,
    file_url: "https://blob.vercel.com/sj-hero.jpg",
    blob_pathname: "uploads/sj-hero.jpg",
    file_type: "image",
    mime_type: "image/jpeg",
    file_size_kb: 250,
    width_px: 1200,
    height_px: 800,
    tags: ["Product A", "hero"],
    ai_tags: [],
    ai_tagged_at: null,
    products: ["Product A", "Product B"],
    product: "Product A",
    collection: "Products",
    status: "approved",
    uploaded_by: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "uuid-2",
    filename: "helm-video.mp4",
    title: "Helm Focus Product Video",
    description: "Product demo video",
    file_url: "https://blob.vercel.com/helm-video.mp4",
    blob_pathname: "uploads/helm-video.mp4",
    file_type: "video",
    mime_type: "video/mp4",
    file_size_kb: 5000,
    width_px: null,
    height_px: null,
    tags: ["Helm Focus", "video"],
    ai_tags: [],
    ai_tagged_at: null,
    products: ["Helm Focus"],
    product: "Helm Focus",
    collection: "Marketing",
    status: "draft",
    uploaded_by: "pixel",
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  },
];

describe("AssetGrid", () => {
  it("renders a grid with all approved assets", () => {
    render(<AssetGrid assets={mockAssets} />);
    const grid = screen.getByTestId("asset-grid");
    expect(grid).toBeInTheDocument();
    const cards = screen.getAllByTestId("asset-card");
    expect(cards).toHaveLength(2);
  });

  it("renders asset titles", () => {
    render(<AssetGrid assets={mockAssets} />);
    expect(screen.getByText("Product A Hero Shot")).toBeInTheDocument();
    expect(screen.getByText("Helm Focus Product Video")).toBeInTheDocument();
  });

  it("renders asset status badges", () => {
    render(<AssetGrid assets={mockAssets} />);
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("renders multiple product names", () => {
    render(<AssetGrid assets={mockAssets} />);
    expect(screen.getAllByText("Product A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Product B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Helm Focus").length).toBeGreaterThan(0);
  });

  it("renders tags", () => {
    render(<AssetGrid assets={mockAssets} />);
    expect(screen.getByText("hero")).toBeInTheDocument();
    expect(screen.getByText("video")).toBeInTheDocument();
  });

  it("renders empty grid when no assets", () => {
    render(<AssetGrid assets={[]} />);
    const grid = screen.getByTestId("asset-grid");
    expect(grid).toBeInTheDocument();
    expect(screen.queryAllByTestId("asset-card")).toHaveLength(0);
  });

  it("renders image for image assets", () => {
    render(<AssetGrid assets={[mockAssets[0]]} />);
    const img = screen.getByRole("img", { name: "Product A Hero Shot" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://blob.vercel.com/sj-hero.jpg");
  });

  it("renders icon for non-image assets", () => {
    render(<AssetGrid assets={[mockAssets[1]]} />);
    // Video should show an emoji icon, not an <img>
    expect(screen.queryByRole("img", { name: /Helm Focus Product Video/i })).toBeNull();
    expect(screen.getByRole("img", { name: "video" })).toBeInTheDocument();
  });

  it("renders detail and download links for each asset", () => {
    render(<AssetGrid assets={[mockAssets[0]]} />);

    expect(
      screen.getByRole("link", { name: "View" })
    ).toHaveAttribute("href", "/asset/uuid-1");
    expect(
      screen.getByRole("link", { name: "Download" })
    ).toHaveAttribute("href", "https://blob.vercel.com/sj-hero.jpg");
    expect(
      screen.getByRole("link", { name: "Download" })
    ).toHaveAttribute("target", "_blank");
  });
});
