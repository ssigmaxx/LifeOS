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

export type FastingSession = {
  id: string;
  startTime: string;
  endTime: string | null;
  targetHours: number | null;
  durationMinutes: number | null;
};

export async function getCurrentFast(): Promise<FastingSession | null> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("fasting_sessions")
    .select("id, start_time, end_time, target_hours")
    .eq("user_id", userId)
    .is("end_time", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    startTime: data.start_time,
    endTime: null,
    targetHours: data.target_hours,
    durationMinutes: null,
  };
}

export async function getLastCompletedFast(): Promise<FastingSession | null> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("fasting_sessions")
    .select("id, start_time, end_time, target_hours")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .order("end_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const durationMinutes = Math.round(
    (new Date(data.end_time).getTime() - new Date(data.start_time).getTime()) / 60000,
  );

  return {
    id: data.id,
    startTime: data.start_time,
    endTime: data.end_time,
    targetHours: data.target_hours,
    durationMinutes,
  };
}

export async function startFast(targetHours: number | null): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("fasting_sessions").insert({
    user_id: userId,
    start_time: new Date().toISOString(),
    target_hours: targetHours,
  });
  if (error) throw error;
}

export async function endFast(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("fasting_sessions")
    .update({ end_time: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function cancelFast(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("fasting_sessions").delete().eq("id", id);
  if (error) throw error;
}
