import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { createAsset, updateAssetTags } from "@/lib/db";
import { tagImageWithGemini } from "@/lib/gemini-tagger";
import { parseProductsInput } from "@/lib/asset-utils";
import { uploadToR2 } from "@/lib/r2";

/**
 * POST /api/assets/upload
 * Accepts multipart/form-data with:
 *   file       — the file binary
 *   title      — required display name
 *   description — optional
 *   tags       — JSON array string e.g. '["hero","q1-2025"]'
 *   products   — optional JSON array string or comma-separated list
 *   uploaded_by — optional string
 */
export async function POST(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null) ?? "";
    const description = (formData.get("description") as string | null) ?? "";
    const tagsRaw = (formData.get("tags") as string | null) ?? "[]";
    const uploaded_by = (formData.get("uploaded_by") as string | null) ?? "api";
    const productsEntries = formData
      .getAll("products")
      .filter((entry): entry is string => typeof entry === "string");
    const legacyProduct = formData.get("product");
    const products = parseProductsInput(
      productsEntries.length > 1
        ? productsEntries
        : productsEntries[0] ?? (typeof legacyProduct === "string" ? legacyProduct : null)
    );

    if (!file || !title) {
      return NextResponse.json(
        { error: "file and title are required" },
        { status: 400 }
      );
    }

    const filename = file.name;
    const mime_type = file.type || "application/octet-stream";

    // Determine file_type from mime_type
    let file_type: "image" | "video" | "pdf" | "raw" | "other" = "other";
    if (mime_type.startsWith("image/")) file_type = "image";
    else if (mime_type.startsWith("video/")) file_type = "video";
    else if (mime_type === "application/pdf") file_type = "pdf";

    let tags: string[] = [];
    try {
      tags = JSON.parse(tagsRaw);
    } catch {
      // fallback: treat as comma-separated
      tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    }

    // Build R2 object key
    const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const fileBuffer = await file.arrayBuffer();
    const file_size_kb = Math.round(fileBuffer.byteLength / 1024);

    // Upload to Cloudflare R2
    const file_url = await uploadToR2(key, fileBuffer, mime_type);

    // Create DB record
    const asset = await createAsset({
      filename,
      title,
      description,
      file_url,
      blob_pathname: key,
      file_type,
      mime_type,
      file_size_kb,
      tags,
      products,
      uploaded_by,
    });

    if (file_type === "image") {
      void tagImageWithGemini(file_url, mime_type)
        .then(async (result) => {
          if (!result) return;

          const mergedTags = Array.from(new Set([...tags, ...result.tags]));

          await updateAssetTags(asset.id, {
            tags: mergedTags,
            aiTags: result.tags,
          });
        })
        .catch((error) => {
          console.error(`[auto-tag] Failed to tag asset ${asset.id}:`, error);
        });
    }

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
