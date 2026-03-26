import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

const DASH_CLIENT_ID = process.env.DASH_CLIENT_ID!;
const DASH_CLIENT_SECRET = process.env.DASH_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/dash-oauth`;

/**
 * GET /api/dash-oauth
 * OAuth2 authorization code callback from Dash.
 * Exchanges the code for an access token and stores it.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px">
        <h2>❌ Dash Authorization Failed</h2>
        <p>Error: ${error}</p>
        <p>${searchParams.get("error_description") ?? ""}</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  if (!code) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px">
        <h2>⚠️ No code received</h2>
        <p>The authorization code was missing from the callback.</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://login.dash.app/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: DASH_CLIENT_ID,
        client_secret: DASH_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} ${text}`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, expires_in } = tokenData;

    // Store token in DB config table
    await sql`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO config (key, value, updated_at)
      VALUES ('dash_access_token', ${access_token}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${access_token}, updated_at = NOW()
    `;

    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px;max-width:600px">
        <h2>✅ Dash Connected!</h2>
        <p>Authorization successful. The access token has been stored.</p>
        <p><strong>Expires in:</strong> ${Math.round(expires_in / 3600)} hours</p>
        <p>Knox will now start migrating your ${5486} assets from Dash to the DAM. This will run in the background — you can close this tab.</p>
        <p><a href="/">← Back to DAM</a></p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px">
        <h2>❌ Token Exchange Failed</h2>
        <p>${err instanceof Error ? err.message : "Unknown error"}</p>
      </body></html>
    `, { headers: { "Content-Type": "text/html" }, status: 500 });
  }
}
