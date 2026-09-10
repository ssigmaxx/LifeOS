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

// Confirmed against the allenporter/python-google-health-api client's
// actual request construction (source of truth here, since the public
// docs/discovery doc kept describing a different shape that Google's own
// API rejected three times running): range.start/range.end are
// CivilDateTime objects — { date: { year, month, day } } — not
// startTime/endTime or civilStartTime/civilEndTime.
function civilDateTime(d: Date) {
  return { date: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() } };
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
      range: { start: civilDateTime(start), end: civilDateTime(end) },
      windowSizeDays: 1,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google Health dailyRollUp(${dataType}) failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as { rollupDataPoints?: unknown[] };
  return json.rollupDataPoints ?? [];
}

async function fetchSleepList(accessToken: string) {
  const url = new URL(`${HEALTH_API_BASE}/sleep/dataPoints`);
  // Both interval.civil_start_time and interval.start_time were rejected
  // with INVALID_DATA_POINT_FILTER_DATA_TYPE_MEMBER — sleep apparently
  // doesn't support filtering on that member at all (the client library's
  // hardcoded field path was stale/wrong). Sidestepping it: fetch the
  // most recent sessions unfiltered and let the caller discard whatever
  // falls outside the sync window instead of guessing a third field name.
  url.searchParams.set("pageSize", "20");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Google Health sleep list failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as { dataPoints?: unknown[] };
  return json.dataPoints ?? [];
}

// Confirmed against a real synced response: steps.countSum and
// heartRate.beatsPerMinuteMin/Avg/Max are the actual leaf fields.
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

// Rollup entries have no top-level startTime string at all — the date
// lives at civilStartTime.date.{year,month,day}, which is why every
// point was silently skipped before (rollupEntryDate always returned
// null). civilStartTime is used rather than civilEndTime since a rollup
// window's start is the civil day the data was accumulated on.
function rollupEntryDate(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  const civilStartTime = record.civilStartTime as Record<string, unknown> | undefined;
  const dateObj = civilStartTime?.date as { year?: number; month?: number; day?: number } | undefined;
  if (!dateObj?.year) return null;
  return `${dateObj.year}-${String(dateObj.month).padStart(2, "0")}-${String(dateObj.day).padStart(2, "0")}`;
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
    fetchSleepList(accessToken),
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
    entry.steps = pickNumber(record.steps, ["countSum"]);
    entry.raw.steps = point;
  }

  for (const point of heartRateRollup) {
    const date = rollupEntryDate(point);
    if (!date) continue;
    const record = point as Record<string, unknown>;
    const entry = entryFor(date);
    // The whole-day average (beatsPerMinuteAvg) reads much higher than what
    // fitness apps label "resting heart rate" (the Google Health app showed
    // noticeably lower numbers) — the daily minimum, mostly recorded during
    // sleep, is a much closer match to that concept than an all-day average.
    const minBpm = pickNumber(record.heartRate, ["beatsPerMinuteMin"]);
    entry.heartRate = minBpm != null ? Math.round(minBpm) : null;
    entry.raw.heartRate = point;
  }

  // fetchSleepList returns recent sessions unfiltered (see its comment) —
  // date strings sort lexicographically, so a plain string bound works.
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  for (const point of sleepPoints) {
    // Confirmed against a real response: the whole session is nested one
    // level under "sleep" (point.sleep.interval / point.sleep.summary),
    // not flat on the point itself.
    const record = point as Record<string, unknown>;
    const sleep = record.sleep as Record<string, unknown> | undefined;
    const metadata = sleep?.metadata as Record<string, unknown> | undefined;
    // Naps and other fragments are excluded — only the flagged primary
    // session counts as "sleep" for the day, same as what a sleep-tracking
    // app's own daily total means.
    if (metadata?.mainSleep !== true) continue;

    // Bucketing by *end* time (wake-up date), not start time: a session
    // starting late one night and one ending early the next morning can
    // both fall on the same calendar date by start time, which was
    // previously summing two different nights' sleep into one inflated
    // total (e.g. a 6h24m + 4h06m pair showing as 10h30m). Wake-up date is
    // also the conventional way sleep apps label "last night's sleep."
    const interval = sleep?.interval as Record<string, unknown> | undefined;
    const endTime = interval?.endTime;
    const date = typeof endTime === "string" ? endTime.slice(0, 10) : null;
    if (!date || date < startDate || date > endDate) continue;

    const summary = sleep?.summary as Record<string, unknown> | undefined;
    const durationMinutes = pickNumber(summary, ["minutesAsleep"]);
    const entry = entryFor(date);
    entry.sleepMinutes = durationMinutes;
    entry.raw.sleep = point;
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
