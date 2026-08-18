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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export type TodayMeditation = { totalMinutes: number; sessionCount: number };

export async function getTodayMeditation(): Promise<TodayMeditation> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("meditation_sessions")
    .select("duration_minutes")
    .eq("user_id", userId)
    .eq("session_date", todayISO());
  if (error) throw error;

  return {
    totalMinutes: data.reduce((sum, s) => sum + s.duration_minutes, 0),
    sessionCount: data.length,
  };
}

export async function logMeditation(durationMinutes: number): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("meditation_sessions").insert({
    user_id: userId,
    session_date: todayISO(),
    duration_minutes: durationMinutes,
  });
  if (error) throw error;
}
