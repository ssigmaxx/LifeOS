import "server-only";
import { createClient } from "@/lib/supabase/server";
import { calculateStreaks, type StreakResult } from "@/lib/streaks";
import { isLogComplete, type TrackingType } from "@/lib/habit-completion";
import type { HabitFormValues } from "@/lib/validations/habit";

export type HabitCategory = {
  id: string;
  name: string;
  icon: string | null;
};

export type Habit = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  trackingType: TrackingType;
  unit: string | null;
  targetValue: number | null;
  scoreWeight: number;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  scheduleWeekdays: number[];
  streak: StreakResult;
  sharedWithFriends: boolean;
};

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

export async function listCategories(): Promise<HabitCategory[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("habit_categories")
    .select("id, name, icon")
    .eq("user_id", userId)
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function createCategory(name: string): Promise<HabitCategory> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("habit_categories")
    .insert({ user_id: userId, name })
    .select("id, name, icon")
    .single();
  if (error) throw error;
  return data;
}

export async function listHabits(): Promise<Habit[]> {
  const { supabase, userId } = await requireUserId();

  const { data: habitRows, error: habitsError } = await supabase
    .from("habits")
    .select(
      "id, category_id, name, description, icon, tracking_type, unit, target_value, score_weight, is_active, start_date, end_date, sort_order, shared_with_friends",
    )
    .eq("user_id", userId)
    .order("sort_order")
    .order("created_at");
  if (habitsError) throw habitsError;
  if (habitRows.length === 0) return [];

  const habitIds = habitRows.map((h) => h.id);

  const [{ data: scheduleRows, error: scheduleError }, { data: logRows, error: logError }] =
    await Promise.all([
      supabase
        .from("habit_schedules")
        .select("habit_id, weekday")
        .in("habit_id", habitIds)
        .is("effective_to", null),
      supabase
        .from("habit_logs")
        .select("habit_id, log_date, value_boolean, value_numeric, value_seconds, target_value_snapshot")
        .in("habit_id", habitIds),
    ]);
  if (scheduleError) throw scheduleError;
  if (logError) throw logError;

  const scheduleByHabit = new Map<string, number[]>();
  for (const row of scheduleRows) {
    const list = scheduleByHabit.get(row.habit_id) ?? [];
    list.push(row.weekday);
    scheduleByHabit.set(row.habit_id, list);
  }

  const logsByHabit = new Map<string, typeof logRows>();
  for (const row of logRows) {
    const list = logsByHabit.get(row.habit_id) ?? [];
    list.push(row);
    logsByHabit.set(row.habit_id, list);
  }

  const today = todayISO();

  return habitRows.map((row) => {
    const trackingType = row.tracking_type as TrackingType;
    const logs = (logsByHabit.get(row.id) ?? []).map((log) => ({
      logDate: log.log_date as string,
      completed: isLogComplete(trackingType, {
        valueBoolean: log.value_boolean,
        valueNumeric: log.value_numeric,
        valueSeconds: log.value_seconds,
        targetValueSnapshot: log.target_value_snapshot,
      }),
    }));

    const streak = calculateStreaks({
      logs,
      scheduleWeekdays: scheduleByHabit.get(row.id) ?? [],
      startDate: row.start_date,
      today,
    });

    return {
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      trackingType,
      unit: row.unit,
      targetValue: row.target_value,
      scoreWeight: row.score_weight,
      isActive: row.is_active,
      startDate: row.start_date,
      endDate: row.end_date,
      scheduleWeekdays: scheduleByHabit.get(row.id) ?? [],
      streak,
      sharedWithFriends: row.shared_with_friends,
    };
  });
}

async function replaceSchedule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  habitId: string,
  weekdays: number[],
) {
  const today = todayISO();
  await supabase
    .from("habit_schedules")
    .update({ effective_to: today })
    .eq("habit_id", habitId)
    .is("effective_to", null);

  if (weekdays.length > 0) {
    const { error } = await supabase.from("habit_schedules").insert(
      weekdays.map((weekday) => ({
        habit_id: habitId,
        weekday,
        effective_from: today,
      })),
    );
    if (error) throw error;
  }
}

export async function createHabit(values: HabitFormValues): Promise<string> {
  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      category_id: values.categoryId || null,
      name: values.name,
      description: values.description ?? null,
      icon: values.icon ?? null,
      tracking_type: values.trackingType,
      unit: values.unit ?? null,
      target_value: values.targetValue ?? null,
      score_weight: values.scoreWeight,
      start_date: values.startDate,
      shared_with_friends: values.sharedWithFriends,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (values.frequency === "custom") {
    await replaceSchedule(supabase, data.id, values.weekdays);
  }

  return data.id;
}

export async function updateHabit(id: string, values: HabitFormValues): Promise<void> {
  const { supabase } = await requireUserId();

  const { error } = await supabase
    .from("habits")
    .update({
      category_id: values.categoryId || null,
      name: values.name,
      description: values.description ?? null,
      icon: values.icon ?? null,
      tracking_type: values.trackingType,
      unit: values.unit ?? null,
      target_value: values.targetValue ?? null,
      score_weight: values.scoreWeight,
      start_date: values.startDate,
      shared_with_friends: values.sharedWithFriends,
    })
    .eq("id", id);
  if (error) throw error;

  await replaceSchedule(supabase, id, values.frequency === "custom" ? values.weekdays : []);
}

export async function setHabitActive(id: string, isActive: boolean): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("habits")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function archiveHabit(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("habits")
    .update({ is_active: false, end_date: todayISO() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteHabit(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) throw error;
}

export async function logHabitToday(
  habitId: string,
  value: {
    valueBoolean?: boolean;
    valueNumeric?: number;
    valueSeconds?: number;
    note?: string;
  },
): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("target_value")
    .eq("id", habitId)
    .single();
  if (habitError) throw habitError;

  const { error } = await supabase.from("habit_logs").upsert(
    {
      habit_id: habitId,
      user_id: userId,
      log_date: todayISO(),
      value_boolean: value.valueBoolean ?? null,
      value_numeric: value.valueNumeric ?? null,
      value_seconds: value.valueSeconds ?? null,
      note: value.note ?? null,
      target_value_snapshot: habit.target_value,
    },
    { onConflict: "habit_id,log_date" },
  );
  if (error) throw error;
}

export async function clearHabitLogToday(habitId: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("habit_logs")
    .delete()
    .eq("habit_id", habitId)
    .eq("log_date", todayISO());
  if (error) throw error;
}

export type TodayLogValue = {
  valueBoolean: boolean | null;
  valueNumeric: number | null;
  valueSeconds: number | null;
  targetValueSnapshot: number | null;
};

export async function getTodayLogs(): Promise<Record<string, TodayLogValue>> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("habit_logs")
    .select("habit_id, value_boolean, value_numeric, value_seconds, target_value_snapshot")
    .eq("user_id", userId)
    .eq("log_date", todayISO());
  if (error) throw error;

  return Object.fromEntries(
    data.map((row) => [
      row.habit_id,
      {
        valueBoolean: row.value_boolean,
        valueNumeric: row.value_numeric,
        valueSeconds: row.value_seconds,
        targetValueSnapshot: row.target_value_snapshot,
      },
    ]),
  );
}
