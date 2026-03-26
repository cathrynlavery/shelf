import { notFound } from "next/navigation";
import { getAssetById } from "@/lib/db";
import AssetDetailView from "@/components/AssetDetailView";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const asset = await getAssetById(params.id);

  if (!asset) {
    notFound();
  }

  return (
    <>
      <Header />

      <div className="container">
        <AssetDetailView initialAsset={asset} />
      </div>
    </>
  );
}
