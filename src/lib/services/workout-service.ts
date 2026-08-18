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

export type TodayWorkout = {
  id: string;
  completed: boolean;
  durationMinutes: number | null;
  workoutType: string | null;
  note: string | null;
} | null;

export async function getTodayWorkout(): Promise<TodayWorkout> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("workout_logs")
    .select("id, completed, duration_minutes, workout_type, note")
    .eq("user_id", userId)
    .eq("workout_date", todayISO())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    completed: data.completed,
    durationMinutes: data.duration_minutes,
    workoutType: data.workout_type,
    note: data.note,
  };
}

export async function logTodayWorkout(input: {
  durationMinutes?: number;
  workoutType?: string;
  note?: string;
}): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("workout_logs").upsert(
    {
      user_id: userId,
      workout_date: todayISO(),
      completed: true,
      duration_minutes: input.durationMinutes ?? null,
      workout_type: input.workoutType ?? null,
      note: input.note ?? null,
    },
    { onConflict: "user_id,workout_date" },
  );
  if (error) throw error;
}

export async function clearTodayWorkout(): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("workout_logs")
    .delete()
    .eq("user_id", userId)
    .eq("workout_date", todayISO());
  if (error) throw error;
}
