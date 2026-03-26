import CollectionOverviewGrid from "@/components/CollectionOverviewGrid";
import { COLLECTIONS } from "@/lib/constants";
import { listCollectionSummaries } from "@/lib/db";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const summaries = await listCollectionSummaries();
  const collectionMap = new Map(summaries.map((summary) => [summary.name, summary]));
  const collections = COLLECTIONS.map((name) => {
    const summary = collectionMap.get(name);
    return (
      summary ?? {
        name,
        count: 0,
        preview_url: null,
        latest_title: null,
      }
    );
  });

  return (
    <>
      <Header />

      <div className="container">
        <div className="page-heading">
          <h2>Collections</h2>
          <p>Browse assets grouped into your configured high-level collections.</p>
        </div>

        <CollectionOverviewGrid collections={collections} />
      </div>
    </>
  );
}
