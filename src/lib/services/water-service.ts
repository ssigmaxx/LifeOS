import "server-only";
import { createClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

// Day boundaries are UTC-based for now, consistent with the rest of the
// app (see habit-service.todayISO) — will move to the user's stored
// timezone once Settings exposes it.
function todayRangeUTC() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const start = new Date(`${todayISO}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export type WaterLog = { id: string; amountMl: number; loggedAt: string };

export type TodayWater = {
  totalMl: number;
  targetMl: number;
  logs: WaterLog[];
};

export async function getTodayWater(): Promise<TodayWater> {
  const { supabase, userId } = await requireUserId();
  const { start, end } = todayRangeUTC();

  const [{ data: logs, error: logsError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
        .from("water_logs")
        .select("id, amount_ml, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", start.toISOString())
        .lt("logged_at", end.toISOString())
        .order("logged_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("water_daily_target_ml")
        .eq("id", userId)
        .single(),
    ]);
  if (logsError) throw logsError;
  if (profileError) throw profileError;

  return {
    totalMl: logs.reduce((sum, l) => sum + l.amount_ml, 0),
    targetMl: profile.water_daily_target_ml,
    logs: logs.map((l) => ({ id: l.id, amountMl: l.amount_ml, loggedAt: l.logged_at })),
  };
}

export async function addWaterLog(amountMl: number): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("water_logs")
    .insert({ user_id: userId, amount_ml: amountMl });
  if (error) throw error;
}

export async function deleteWaterLog(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("water_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function updateWaterTarget(targetMl: number): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ water_daily_target_ml: targetMl })
    .eq("id", userId);
  if (error) throw error;
}
