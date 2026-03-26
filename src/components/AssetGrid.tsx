"use client";

import type { Asset } from "@/lib/db";

const FILE_ICONS: Record<string, string> = {
  image: "🖼️",
  video: "🎬",
  pdf: "📄",
  raw: "📦",
  other: "📎",
};

function AssetCard({ asset }: { asset: Asset }) {
  const isImage = asset.file_type === "image" && asset.file_url;
  const icon = FILE_ICONS[asset.file_type] ?? "📎";
  const products = asset.products ?? (asset.product ? [asset.product] : []);
  const otherTags = asset.tags.filter((tag) => !products.includes(tag));

  return (
    <div className="card" data-testid="asset-card">
      <a href={`/asset/${asset.id}`} className="card-link">
        <div className="card-thumb">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.file_url} alt={asset.title} loading="lazy" />
          ) : (
            <span role="img" aria-label={asset.file_type}>
              {icon}
            </span>
          )}
          <div className="card-status-badge">
            <span className={`badge badge-${asset.status}`}>{asset.status}</span>
          </div>
        </div>
      </a>
      <div className="card-body">
        <a href={`/asset/${asset.id}`} className="card-title-link">
          <div className="card-title" title={asset.title}>
            {asset.title}
          </div>
        </a>
        <div className="card-meta">{asset.file_type} · {asset.filename}</div>
        {products.length > 0 && (
          <div className="tags card-products">
            {products.map((product) => (
              <span key={product} className="tag tag-product">
                {product}
              </span>
            ))}
          </div>
        )}
        {otherTags.length > 0 && (
          <div className="tags">
            {otherTags.slice(0, 4).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
            {otherTags.length > 4 && (
              <span className="tag">+{otherTags.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssetGrid({ assets }: { assets: Asset[] }) {
  return (
    <div className="grid" data-testid="asset-grid">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
