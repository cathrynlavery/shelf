import { searchAssetsPage } from "@/lib/db";
import { PRODUCTS, FILE_TYPES, ASSET_STATUSES, COLLECTIONS } from "@/lib/constants";
import AssetGrid from "@/components/AssetGrid";
import type { FileType, AssetStatus } from "@/lib/db";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

interface SearchParams {
  product?: string;
  file_type?: string;
  status?: string;
  collection?: string;
  q?: string;
  page?: string;
}

const PAGE_SIZE = 24;

function buildPageHref(
  searchParams: SearchParams,
  nextPage: number
): string {
  const params = new URLSearchParams();

  Object.entries({
    q: searchParams.q,
    product: searchParams.product,
    collection: searchParams.collection,
    file_type: searchParams.file_type,
    status: searchParams.status,
  }).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  if (nextPage > 1) {
    params.set("page", String(nextPage));
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { product, file_type, status = "approved", collection, q, page } = searchParams;
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const { assets, total } = await searchAssetsPage({
    product,
    file_type: file_type as FileType | undefined,
    status: status as AssetStatus | undefined,
    collection,
    query: q,
    limit: PAGE_SIZE,
    offset,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <>
      <Header />

      <div className="container">
        <form className="filters" method="GET">
          <input
            name="q"
            type="search"
            placeholder="Search by title, tag, or filename…"
            defaultValue={q}
          />
          <select name="product" defaultValue={product ?? ""}>
            <option value="">All Product Tags</option>
            {PRODUCTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select name="collection" defaultValue={collection ?? ""}>
            <option value="">All Collections</option>
            {COLLECTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select name="file_type" defaultValue={file_type ?? ""}>
            <option value="">All Types</option>
            {FILE_TYPES.map((ft) => (
              <option key={ft} value={ft}>
                {ft}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? ""}>
            <option value="">All Statuses</option>
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            Filter
          </button>
        </form>

        <div className="results-toolbar">
          <span>
            Showing {assets.length === 0 ? 0 : offset + 1}-{offset + assets.length} of {total}
            {q ? ` results for "${q}"` : " assets"}
          </span>
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {assets.length === 0 ? (
          <div className="empty-state">
            <h2>No assets found</h2>
            <p>Try adjusting your filters or upload new assets.</p>
          </div>
        ) : (
          <>
            <AssetGrid assets={assets} />
            <div className="pagination">
              <a
                href={buildPageHref(searchParams, currentPage - 1)}
                className={`btn btn-outline${hasPreviousPage ? "" : " btn-disabled"}`}
                aria-disabled={!hasPreviousPage}
              >
                Previous
              </a>
              <a
                href={buildPageHref(searchParams, currentPage + 1)}
                className={`btn btn-outline${hasNextPage ? "" : " btn-disabled"}`}
                aria-disabled={!hasNextPage}
              >
                Next
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}
