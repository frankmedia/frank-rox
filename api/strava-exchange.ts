import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for local dev and prod same-origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code } = req.body || {};
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing code" });
    }

    const clientId = process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET || process.env.VITE_STRAVA_CLIENT_SECRET;
    const redirectUri = process.env.STRAVA_REDIRECT_URI || process.env.VITE_STRAVA_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Server missing Strava credentials" });
    }

    const form = new URLSearchParams();
    form.set("client_id", String(clientId));
    form.set("client_secret", String(clientSecret));
    form.set("code", code);
    form.set("grant_type", "authorization_code");
    if (redirectUri) form.set("redirect_uri", redirectUri);

    const tokenResp = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const tokenJson = await tokenResp.json();

    if (!tokenResp.ok) {
      return res.status(tokenResp.status).json({ error: tokenJson?.message || "Token exchange failed", details: tokenJson });
    }

    // Sanitize response for client; do not expose client secret
    const {
      access_token,
      refresh_token,
      expires_at,
      athlete,
      token_type,
      scope,
    } = tokenJson as any;

    // Set HttpOnly cookies to persist tokens server-side
    try {
      const cookies: string[] = [];
      const secure = process.env.VERCEL ? true : false;
      // Access token (short-lived)
      cookies.push(
        `strava_access_token=${encodeURIComponent(access_token)}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=${Math.max(0, Number(expires_at) - Math.floor(Date.now() / 1000))}`
      );
      // Refresh token (longer-lived)
      if (refresh_token) {
        cookies.push(
          `strava_refresh_token=${encodeURIComponent(refresh_token)}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=${60 * 60 * 24 * 30}`
        );
      }
      res.setHeader('Set-Cookie', cookies);
    } catch {}

    return res.status(200).json({
      access_token,
      refresh_token,
      expires_at,
      token_type,
      scope,
      athlete: athlete ? { id: athlete.id, firstname: athlete.firstname, lastname: athlete.lastname } : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Unexpected server error", details: err?.message || String(err) });
  }
}


