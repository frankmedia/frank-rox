export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  distance_m: number;
  moving_time_s: number;
  elapsed_time_s: number;
  elevation_gain_m: number;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  device_name?: string | null;
}

export async function importRecentActivities(): Promise<{
  count: number;
  activities: StravaActivity[];
}> {
  const resp = await fetch('/api/strava-import', { method: 'POST' });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${resp.status}`);
  }
  return await resp.json();
}


