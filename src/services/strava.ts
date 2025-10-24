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

function getCurrentUsername(): string {
  try {
    const userStr = localStorage.getItem("frank_rock_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.username || "frank";
    }
  } catch {}
  return "frank";
}

function getImportedIdsKey(username: string): string {
  return `importedStravaIds_${username}`;
}

function loadImportedIds(username: string): Set<number> {
  try {
    const raw = localStorage.getItem(getImportedIdsKey(username));
    if (raw) return new Set<number>(JSON.parse(raw));
  } catch {}
  return new Set<number>();
}

function saveImportedIds(username: string, ids: Set<number>) {
  try {
    localStorage.setItem(getImportedIdsKey(username), JSON.stringify(Array.from(ids)));
  } catch {}
}

// Lightweight lazy import to avoid bundling cycle
async function logExerciseLazy(
  exerciseName: string,
  data: { duration?: number; distance?: number; notes?: string }
): Promise<void> {
  const mod = await import("./googleSheets");
  await mod.logExercise(exerciseName, data);
}

export async function saveActivitiesToLog(activities: StravaActivity[]): Promise<{ saved: number; skipped: number }> {
  const username = getCurrentUsername();
  const importedIds = loadImportedIds(username);

  let saved = 0;
  let skipped = 0;

  for (const a of activities) {
    if (importedIds.has(a.id)) {
      skipped++;
      continue;
    }

    const durationMin = Math.round((a.moving_time_s || 0) / 60);
    const distanceKm = a.distance_m ? +(a.distance_m / 1000).toFixed(2) : undefined;
    const name = a.name || a.type || "Activity";
    const exerciseName = `Strava: ${a.type || "Activity"}`;
    const notesParts = [
      `Imported: ${name}`,
      `ID ${a.id}`,
      a.device_name ? `Device ${a.device_name}` : undefined,
      a.has_heartrate && a.average_heartrate ? `Avg HR ${Math.round(a.average_heartrate)}` : undefined,
    ].filter(Boolean);

    try {
      await logExerciseLazy(exerciseName, {
        duration: durationMin || undefined,
        distance: distanceKm || undefined,
        notes: notesParts.join(" • "),
      });
      importedIds.add(a.id);
      saved++;
    } catch {
      // continue, do not add id
    }
  }

  if (saved > 0) saveImportedIds(username, importedIds);
  return { saved, skipped };
}


