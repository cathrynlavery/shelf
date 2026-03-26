import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { parseProductsInput } from "@/lib/asset-utils";
import { getAssetById, updateAsset } from "@/lib/db";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  try {
    const asset = await getAssetById(params.id);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    return NextResponse.json({ asset });
  } catch (err) {
    console.error("Get asset error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { title, description, tags, status } = body;
    const products = body.products === undefined
      ? undefined
      : parseProductsInput(Array.isArray(body.products) ? body.products : body.products ?? null);

    const allowed = { title, description, tags, status, products };
    // Strip undefined keys
    const updates = Object.fromEntries(
      Object.entries(allowed).filter(([, v]) => v !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const asset = await updateAsset(params.id, updates);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (err) {
    console.error("Update asset error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
