import { NextRequest } from "next/server";
import { serverConfig } from "@/lib/config";

/**
 * Validate the X-API-Key header against the configured API_KEY env var.
 * Returns true if valid, false otherwise.
 */
export function validateApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return false;
  const expected = process.env.API_KEY;
  if (!expected) return false; // API_KEY not configured
  return apiKey === expected;
}

/**
 * Returns a 401 JSON response for missing/invalid API keys.
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Parse a Basic Auth header value.
 * Returns { username, password } or null if invalid.
 */
export function parseBasicAuth(
  authHeader: string | null
): { username: string; password: string } | null {
  if (!authHeader || !authHeader.startsWith("Basic ")) return null;
  try {
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) return null;
    return {
      username: decoded.slice(0, colonIdx),
      password: decoded.slice(colonIdx + 1),
    };
  } catch {
    return null;
  }
}

/**
 * Validate Basic Auth for team UI.
 * Username from SHELF_AUTH_USERNAME (default: "admin"), password from UI_PASSWORD env var.
 */
export function validateBasicAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const credentials = parseBasicAuth(authHeader);
  if (!credentials) return false;
  const expectedPassword = process.env.UI_PASSWORD;
  if (!expectedPassword) return false;
  return credentials.username === serverConfig.authUsername && credentials.password === expectedPassword;
}
