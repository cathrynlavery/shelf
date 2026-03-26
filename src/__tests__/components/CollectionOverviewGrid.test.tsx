import React from "react";
import { render, screen } from "@testing-library/react";
import CollectionOverviewGrid from "@/components/CollectionOverviewGrid";

describe("CollectionOverviewGrid", () => {
  it("renders collection cards with links, counts, and previews", () => {
    render(
      <CollectionOverviewGrid
        collections={[
          {
            name: "Products",
            count: 12,
            preview_url: "https://cdn.example.com/products.jpg",
            latest_title: "Product A Hero",
          },
          {
            name: "Marketing",
            count: 0,
            preview_url: null,
            latest_title: null,
          },
        ]}
      />
    );

    expect(screen.getByRole("link", { name: /Products/i })).toHaveAttribute(
      "href",
      "/collections/Products"
    );
    expect(screen.getByText("12 asset(s)")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Products" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Marketing/i })).toHaveAttribute(
      "href",
      "/collections/Marketing"
    );
  });
});
