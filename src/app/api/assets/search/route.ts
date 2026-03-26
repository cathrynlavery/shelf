import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { searchAssetsPage } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { tags, file_type, status, product, collection, q, limit = 20, offset = 0 } = body;

    const { assets, total } = await searchAssetsPage({
      tags,
      file_type,
      status,
      product,
      collection,
      query: q,
      limit,
      offset,
    });

    return NextResponse.json({ assets, count: total });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
