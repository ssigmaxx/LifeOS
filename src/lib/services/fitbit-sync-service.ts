import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { refreshAccessToken } from "@/lib/services/fitbit-service";

const HEALTH_API_BASE = "https://health.googleapis.com/v4/users/me/dataTypes";
// Re-synced on every run so a device that uploads data late (a watch that
// only syncs to its phone once a day) still gets picked up within a few
// cron cycles instead of being permanently missed.
const SYNC_WINDOW_DAYS = 3;

type FitbitConnectionRow = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

function dayBoundaryIso(d: Date) {
  return `${isoDate(d)}T00:00:00Z`;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchDailyRollup(accessToken: string, dataType: string, start: Date, end: Date) {
  const response = await fetch(`${HEALTH_API_BASE}/${dataType}/dataPoints:dailyRollUp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      range: { startTime: dayBoundaryIso(start), endTime: dayBoundaryIso(end) },
      windowSizeDays: 1,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google Health dailyRollUp(${dataType}) failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as { rollupDataPoints?: unknown[] };
  return json.rollupDataPoints ?? [];
}

async function fetchSleepList(accessToken: string, start: Date, end: Date) {
  const url = new URL(`${HEALTH_API_BASE}/sleep/dataPoints`);
  url.searchParams.set(
    "filter",
    `sleep.interval.civil_start_time >= "${isoDate(start)}T00:00:00" AND sleep.interval.civil_start_time < "${isoDate(end)}T00:00:00"`,
  );
  url.searchParams.set("pageSize", "50");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Google Health sleep list failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as { dataPoints?: unknown[] };
  return json.dataPoints ?? [];
}

// The exact leaf field name inside each rollup value (StepsRollupValue,
// HeartRateRollupValue) wasn't confirmed against a live response at
// write time, so this tries the plausible candidates in order rather
// than hardcoding one guess. `raw` is stored alongside every row
// specifically so a wrong guess here can be corrected later by reading
// real synced data instead of needing another live API call.
function pickNumber(obj: unknown, keys: string[]): number | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  }
  return null;
}

function rollupEntryDate(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  const startTime = record.startTime;
  if (typeof startTime !== "string") return null;
  return startTime.slice(0, 10);
}

async function syncOneConnection(row: FitbitConnectionRow) {
  const admin = createAdminClient();

  let accessToken = row.access_token;
  // Refresh proactively (2 min buffer) rather than waiting for a 401 —
  // this cron only runs every 4 hours, so a token that's merely "about to
  // expire" right now would otherwise fail this entire sync.
  if (new Date(row.expires_at).getTime() < Date.now() + 2 * 60 * 1000) {
    const refreshed = await refreshAccessToken(row.refresh_token);
    accessToken = refreshed.access_token;
    await admin
      .from("fitbit_connections")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? row.refresh_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", row.user_id);
  }

  const end = new Date();
  const start = new Date(end.getTime() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [stepsRollup, heartRateRollup, sleepPoints] = await Promise.all([
    fetchDailyRollup(accessToken, "steps", start, end),
    fetchDailyRollup(accessToken, "heart-rate", start, end),
    fetchSleepList(accessToken, start, end),
  ]);

  const byDate = new Map<string, { steps: number | null; heartRate: number | null; sleepMinutes: number | null; raw: Record<string, unknown> }>();
  function entryFor(date: string) {
    let entry = byDate.get(date);
    if (!entry) {
      entry = { steps: null, heartRate: null, sleepMinutes: null, raw: {} };
      byDate.set(date, entry);
    }
    return entry;
  }

  for (const point of stepsRollup) {
    const date = rollupEntryDate(point);
    if (!date) continue;
    const record = point as Record<string, unknown>;
    const entry = entryFor(date);
    entry.steps = pickNumber(record.steps, ["count", "value", "sum", "total"]);
    entry.raw.steps = point;
  }

  for (const point of heartRateRollup) {
    const date = rollupEntryDate(point);
    if (!date) continue;
    const record = point as Record<string, unknown>;
    const entry = entryFor(date);
    entry.heartRate = pickNumber(record.heartRate, ["avgBpm", "averageBpm", "average", "restingBpm", "min"]);
    entry.raw.heartRate = point;
  }

  for (const point of sleepPoints) {
    const record = point as Record<string, unknown>;
    const interval = record.interval as Record<string, unknown> | undefined;
    const civilStart = interval?.civilStartTime as Record<string, unknown> | undefined;
    const dateObj = civilStart?.date as { year?: number; month?: number; day?: number } | undefined;
    const date = dateObj?.year
      ? `${dateObj.year}-${String(dateObj.month).padStart(2, "0")}-${String(dateObj.day).padStart(2, "0")}`
      : null;
    if (!date) continue;
    const durationMinutes = pickNumber(record, ["durationMinutes", "minutes"]);
    const entry = entryFor(date);
    // Sum rather than overwrite — a night can have more than one sleep
    // session (a nap plus the main sleep), all landing on the same date.
    if (durationMinutes !== null) {
      entry.sleepMinutes = (entry.sleepMinutes ?? 0) + durationMinutes;
    }
    entry.raw.sleep = [...((entry.raw.sleep as unknown[]) ?? []), point];
  }

  const rows = Array.from(byDate.entries()).map(([date, entry]) => ({
    user_id: row.user_id,
    date,
    steps: entry.steps,
    resting_heart_rate: entry.heartRate,
    sleep_minutes: entry.sleepMinutes,
    raw: entry.raw,
    synced_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error } = await admin.from("health_daily_metrics").upsert(rows, { onConflict: "user_id,date" });
    if (error) throw error;
  }
}

export async function syncCurrentUserFitbit() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  // Uses the admin client (not the caller's own session) purely because
  // syncOneConnection's writes to health_daily_metrics have no
  // user-facing insert/update policy — only the cron job is meant to
  // write there. The row fetched is still scoped to this one user.
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("fitbit_connections")
    .select("user_id, access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("No Fitbit connection found.");

  await syncOneConnection(row);
}

export async function syncAllFitbitConnections() {
  const admin = createAdminClient();
  const { data: connections, error } = await admin
    .from("fitbit_connections")
    .select("user_id, access_token, refresh_token, expires_at");
  if (error) throw error;

  let synced = 0;
  let failed = 0;
  for (const row of connections ?? []) {
    try {
      await syncOneConnection(row);
      synced += 1;
    } catch {
      failed += 1;
    }
  }
  return { synced, failed, total: (connections ?? []).length };
}
