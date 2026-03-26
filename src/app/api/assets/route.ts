import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { listAssets, FileType, AssetStatus } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = req.nextUrl;
    const product = searchParams.get("product") ?? undefined;
    const collection = searchParams.get("collection") ?? undefined;
    const query = searchParams.get("q") ?? undefined;
    const status = (searchParams.get("status") ?? undefined) as AssetStatus | undefined;
    const file_type = (searchParams.get("file_type") ?? undefined) as FileType | undefined;
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const assets = await listAssets({ product, collection, query, status, file_type, limit, offset });

    return NextResponse.json({ assets, count: assets.length });
  } catch (err) {
    console.error("List assets error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
