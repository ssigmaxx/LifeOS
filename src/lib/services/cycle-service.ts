import "server-only";
import { createClient } from "@/lib/supabase/server";
import { estimateNextPeriod, type CyclePrediction } from "@/lib/cycle-prediction";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export type PeriodFlow = "spotting" | "light" | "medium" | "heavy";

export const PERIOD_FLOWS: PeriodFlow[] = ["spotting", "light", "medium", "heavy"];

export type CycleLog = {
  logDate: string;
  periodFlow: PeriodFlow | null;
  pillTaken: boolean | null;
  mood: number | null;
  painLevel: number | null;
  symptoms: string[];
  note: string | null;
};

export type CycleLogInput = {
  periodFlow?: PeriodFlow | null;
  pillTaken?: boolean | null;
  mood?: number | null;
  painLevel?: number | null;
  symptoms?: string[];
  note?: string | null;
};

function mapRow(row: {
  log_date: string;
  period_flow: string | null;
  pill_taken: boolean | null;
  mood: number | null;
  pain_level: number | null;
  symptoms: string[] | null;
  note: string | null;
}): CycleLog {
  return {
    logDate: row.log_date,
    periodFlow: row.period_flow as PeriodFlow | null,
    pillTaken: row.pill_taken,
    mood: row.mood,
    painLevel: row.pain_level,
    symptoms: row.symptoms ?? [],
    note: row.note,
  };
}

export async function isCycleTrackingEnabled(): Promise<boolean> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("cycle_tracking_enabled")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.cycle_tracking_enabled ?? false;
}

export async function setCycleTrackingEnabled(enabled: boolean): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ cycle_tracking_enabled: enabled })
    .eq("id", userId);
  if (error) throw error;
}

export async function getCycleLog(date: string = todayISO()): Promise<CycleLog | null> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("cycle_logs")
    .select("log_date, period_flow, pill_taken, mood, pain_level, symptoms, note")
    .eq("user_id", userId)
    .eq("log_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function listCycleLogs(range: { start?: string; end?: string } = {}): Promise<CycleLog[]> {
  const { supabase, userId } = await requireUserId();
  let query = supabase
    .from("cycle_logs")
    .select("log_date, period_flow, pill_taken, mood, pain_level, symptoms, note")
    .eq("user_id", userId)
    .order("log_date", { ascending: false });
  if (range.start) query = query.gte("log_date", range.start);
  if (range.end) query = query.lte("log_date", range.end);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapRow);
}

export async function upsertCycleLog(date: string, input: CycleLogInput): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("cycle_logs").upsert(
    {
      user_id: userId,
      log_date: date,
      period_flow: input.periodFlow ?? null,
      pill_taken: input.pillTaken ?? null,
      mood: input.mood ?? null,
      pain_level: input.painLevel ?? null,
      symptoms: input.symptoms ?? [],
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,log_date" },
  );
  if (error) throw error;
}

// Just the dates with a logged period in range — used for calendar
// marking (both the mini month calendar on /cycle and the pink events on
// the main /calendar), which only needs the date, not the full log.
export async function listPeriodDates(range: { start: string; end: string }): Promise<string[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("cycle_logs")
    .select("log_date")
    .eq("user_id", userId)
    .not("period_flow", "is", null)
    .gte("log_date", range.start)
    .lte("log_date", range.end)
    .order("log_date");
  if (error) throw error;
  return data.map((row) => row.log_date as string);
}

export async function deleteCycleLog(date: string): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("cycle_logs")
    .delete()
    .eq("user_id", userId)
    .eq("log_date", date);
  if (error) throw error;
}

export type { CyclePrediction };

// Estimates the next period from the user's own logged history — see
// cycle-prediction.ts for why there's no external API involved and for
// the (unit-tested) algorithm itself.
export async function predictNextPeriod(): Promise<CyclePrediction> {
  const logs = await listCycleLogs({ start: addDays(todayISO(), -365) });
  const periodDates = logs.filter((l) => l.periodFlow != null).map((l) => l.logDate);
  return estimateNextPeriod(periodDates);
}
