/**
 * Cloudflare R2 storage helper
 * Uses the Cloudflare REST API — no S3 credentials needed.
 */

import { serverConfig } from "@/lib/config";

const CF_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const CF_TOKEN = process.env.R2_TOKEN!;
const BUCKET = serverConfig.r2Bucket;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function uploadToR2(
  key: string,
  body: ArrayBuffer,
  contentType: string
): Promise<string> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": contentType,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed: ${res.status} ${text}`);
  }

  return `${PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`;

  await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
    },
  });
}

export function r2PublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}
