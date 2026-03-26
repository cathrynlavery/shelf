import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { updateAsset, getAssetById } from "@/lib/db";

type Params = { params: { id: string } };

/**
 * POST /api/assets/[id]/complete
 * Legacy finalize endpoint for external upload flows.
 * Updates the asset record with the final file URL (asset stays in draft until approved).
 *
 * Body: { file_url: string, file_size_kb?: number, width_px?: number, height_px?: number }
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  try {
    const existing = await getAssetById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await req.json();
    const { file_url, file_size_kb, width_px, height_px } = body;

    if (!file_url) {
      return NextResponse.json(
        { error: "file_url is required" },
        { status: 400 }
      );
    }

    const asset = await updateAsset(params.id, {
      file_url,
      file_size_kb,
      width_px,
      height_px,
      status: "draft", // stays draft until a human approves
    });

    return NextResponse.json({ asset });
  } catch (err) {
    console.error("Complete upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
