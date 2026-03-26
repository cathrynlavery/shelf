import type { CollectionSummary } from "@/lib/db";

export default function CollectionOverviewGrid({
  collections,
}: {
  collections: CollectionSummary[];
}) {
  return (
    <div className="collection-grid">
      {collections.map((collection) => (
        <a
          key={collection.name}
          href={`/collections/${encodeURIComponent(collection.name)}`}
          className="collection-card"
        >
          <div className="collection-thumb">
            {collection.preview_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={collection.preview_url} alt={collection.name} />
            ) : (
              <span>{collection.name}</span>
            )}
          </div>
          <div className="collection-card-body">
            <div className="collection-card-title">{collection.name}</div>
            <div className="collection-card-meta">{collection.count} asset(s)</div>
            {collection.latest_title && (
              <div className="collection-card-meta">
                Latest: {collection.latest_title}
              </div>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
