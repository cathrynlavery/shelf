/**
 * Tests for the DB query layer
 * @jest-environment node
 */
const sqlTagMock = jest.fn().mockResolvedValue({ rows: [] });
const sqlQueryMock = jest.fn();

jest.mock("@vercel/postgres", () => ({
  sql: Object.assign(sqlTagMock, {
    query: sqlQueryMock,
    connect: jest.fn(),
  }),
}));

describe("searchAssetsPage", () => {
  beforeEach(() => {
    jest.resetModules();
    sqlTagMock.mockClear();
    sqlQueryMock.mockReset();
  });

  it("filters by product against the products array column", async () => {
    sqlQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    const { searchAssetsPage } = await import("@/lib/db");

    await searchAssetsPage({ product: "Product A", limit: 20, offset: 0 });

    expect(sqlQueryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("$1 = ANY(products)"),
      ["Product A", 20, 0]
    );
  });
});
