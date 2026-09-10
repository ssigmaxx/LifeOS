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

export type DailyHealthMetric = {
  date: string;
  steps: number | null;
  restingHeartRate: number | null;
  avgHeartRate: number | null;
  sleepMinutes: number | null;
};

export async function getRecentHealthMetrics(days: number): Promise<DailyHealthMetric[]> {
  const { supabase, userId } = await requireUserId();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("health_daily_metrics")
    .select("date, steps, resting_heart_rate, avg_heart_rate, sleep_minutes")
    .eq("user_id", userId)
    .gte("date", since)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    date: row.date,
    steps: row.steps,
    restingHeartRate: row.resting_heart_rate,
    avgHeartRate: row.avg_heart_rate,
    sleepMinutes: row.sleep_minutes,
  }));
}
