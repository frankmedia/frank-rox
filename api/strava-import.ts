import type { VercelRequest, VercelResponse } from "@vercel/node";

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      out[key] = val;
    }
  });
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const cookies = parseCookies(req.headers.cookie);
    let accessToken = cookies["strava_access_token"];
    const refreshToken = cookies["strava_refresh_token"];

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ error: "Not connected to Strava" });
    }

    async function fetchActivities(token: string) {
      const nowSec = Math.floor(Date.now() / 1000);
      // fetch last 30 days
      const after = nowSec - 60 * 60 * 24 * 30;
      const url = `https://www.strava.com/api/v3/athlete/activities?per_page=50&after=${after}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      return r;
    }

    let resp = await fetchActivities(accessToken || "");

    // If unauthorized, try to refresh
    if (resp.status === 401 && refreshToken) {
      const clientId = process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID;
      const clientSecret = process.env.STRAVA_CLIENT_SECRET || process.env.VITE_STRAVA_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: "Server missing Strava credentials" });
      }
      const form = new URLSearchParams();
      form.set("client_id", String(clientId));
      form.set("client_secret", String(clientSecret));
      form.set("grant_type", "refresh_token");
      form.set("refresh_token", refreshToken);
      const refreshResp = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const refreshJson = await refreshResp.json();
      if (!refreshResp.ok) {
        return res.status(401).json({ error: "Unable to refresh token", details: refreshJson });
      }
      accessToken = refreshJson.access_token;
      // update cookies
      try {
        const secure = process.env.VERCEL ? true : false;
        res.setHeader("Set-Cookie", [
          `strava_access_token=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=${Math.max(0, Number(refreshJson.expires_at) - Math.floor(Date.now() / 1000))}`
        ]);
      } catch {}
      resp = await fetchActivities(accessToken);
    }

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(resp.status).json({ error: "Failed to fetch activities", details: err });
    }

    const activities = await resp.json();
    // Map down to essentials for client
    const mapped = (activities as any[]).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      start_date: a.start_date,
      distance_m: a.distance,
      moving_time_s: a.moving_time,
      elapsed_time_s: a.elapsed_time,
      elevation_gain_m: a.total_elevation_gain,
      has_heartrate: a.has_heartrate,
      average_heartrate: a.average_heartrate,
      max_heartrate: a.max_heartrate,
      device_name: a.device_name || null,
    }));

    return res.status(200).json({ count: mapped.length, activities: mapped });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}


