import { notFound } from "next/navigation";
import AssetGrid from "@/components/AssetGrid";
import { COLLECTIONS } from "@/lib/constants";
import { listAssets } from "@/lib/db";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
}: {
  params: { collection: string };
}) {
  const collection = decodeURIComponent(params.collection);

  if (!COLLECTIONS.includes(collection as (typeof COLLECTIONS)[number])) {
    notFound();
  }

  const assets = await listAssets({
    collection,
    status: "approved",
    limit: 120,
  });

  return (
    <>
      <Header />

      <div className="container">
        <div className="page-heading">
          <a href="/collections" className="detail-backlink">
            ← Back to collections
          </a>
          <h2>{collection}</h2>
          <p>{assets.length} approved asset(s)</p>
        </div>

        {assets.length === 0 ? (
          <div className="empty-state">
            <h2>No assets in this collection yet</h2>
            <p>Import or tag assets into this collection to populate the view.</p>
          </div>
        ) : (
          <AssetGrid assets={assets} />
        )}
      </div>
    </>
  );
}
