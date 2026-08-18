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

export type SleepLog = {
  id: string;
  sleepStart: string;
  sleepEnd: string;
  durationMinutes: number;
  quality: number | null;
};

export async function getLatestSleep(): Promise<SleepLog | null> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("id, sleep_start, sleep_end, duration_minutes, quality")
    .eq("user_id", userId)
    .order("sleep_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    sleepStart: data.sleep_start,
    sleepEnd: data.sleep_end,
    durationMinutes: data.duration_minutes,
    quality: data.quality,
  };
}

export async function logSleep(input: {
  sleepStart: string; // ISO datetime
  sleepEnd: string; // ISO datetime
  quality?: number;
  note?: string;
}): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const start = new Date(input.sleepStart);
  const end = new Date(input.sleepEnd);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (durationMinutes <= 0) {
    throw new Error("Wake-up time must be after bedtime.");
  }

  const { error } = await supabase.from("sleep_logs").insert({
    user_id: userId,
    sleep_start: start.toISOString(),
    sleep_end: end.toISOString(),
    duration_minutes: durationMinutes,
    quality: input.quality ?? null,
    note: input.note ?? null,
  });
  if (error) throw error;
}

export async function deleteSleepLog(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("sleep_logs").delete().eq("id", id);
  if (error) throw error;
}
