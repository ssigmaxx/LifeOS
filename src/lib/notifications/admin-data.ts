import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { calculateStreaks, isHabitDueToday, type HabitLogEntry } from "@/lib/streaks";
import { isLogComplete, type TrackingType } from "@/lib/habit-completion";

// Cron-only data access: uses the service-role admin client to read across
// all users (bypassing RLS), unlike every other service file which is
// scoped to the signed-in user via requireUserId(). Never import this into
// a user-facing request path.

type AdminClient = ReturnType<typeof createAdminClient>;

function addDaysISO(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export type HabitDayCounts = { dueCount: number; completedCount: number };

export type UserHabitContext = {
  today: HabitDayCounts;
  yesterday: HabitDayCounts;
  bestActiveStreak: { habitName: string; length: number } | null;
};

export async function getUserHabitContext(
  admin: AdminClient,
  userId: string,
  todayISO: string,
): Promise<UserHabitContext> {
  const yesterdayISO = addDaysISO(todayISO, -1);
  const empty: UserHabitContext = {
    today: { dueCount: 0, completedCount: 0 },
    yesterday: { dueCount: 0, completedCount: 0 },
    bestActiveStreak: null,
  };

  const { data: habits, error: habitsError } = await admin
    .from("habits")
    .select("id, name, tracking_type, is_active, start_date, end_date")
    .eq("user_id", userId);
  if (habitsError) throw habitsError;
  if (!habits || habits.length === 0) return empty;

  const habitIds = habits.map((h) => h.id);
  const [{ data: scheduleRows, error: scheduleError }, { data: logRows, error: logError }] =
    await Promise.all([
      admin
        .from("habit_schedules")
        .select("habit_id, weekday")
        .in("habit_id", habitIds)
        .is("effective_to", null),
      admin
        .from("habit_logs")
        .select("habit_id, log_date, value_boolean, value_numeric, value_seconds, target_value_snapshot")
        .in("habit_id", habitIds),
    ]);
  if (scheduleError) throw scheduleError;
  if (logError) throw logError;

  const scheduleByHabit = new Map<string, number[]>();
  for (const row of scheduleRows ?? []) {
    const list = scheduleByHabit.get(row.habit_id) ?? [];
    list.push(row.weekday);
    scheduleByHabit.set(row.habit_id, list);
  }

  const logsByHabit = new Map<string, typeof logRows>();
  for (const row of logRows ?? []) {
    const list = logsByHabit.get(row.habit_id) ?? [];
    list.push(row);
    logsByHabit.set(row.habit_id, list);
  }

  let todayDue = 0;
  let todayCompleted = 0;
  let yesterdayDue = 0;
  let yesterdayCompleted = 0;
  let bestActiveStreak: { habitName: string; length: number } | null = null;

  for (const habit of habits) {
    const trackingType = habit.tracking_type as TrackingType;
    const scheduleWeekdays = scheduleByHabit.get(habit.id) ?? [];

    const completedByDate = new Map<string, boolean>();
    for (const log of logsByHabit.get(habit.id) ?? []) {
      completedByDate.set(
        log.log_date,
        isLogComplete(trackingType, {
          valueBoolean: log.value_boolean,
          valueNumeric: log.value_numeric,
          valueSeconds: log.value_seconds,
          targetValueSnapshot: log.target_value_snapshot,
        }),
      );
    }

    const dueArgs = {
      isActive: habit.is_active,
      startDate: habit.start_date,
      endDate: habit.end_date,
      scheduleWeekdays,
    };

    if (isHabitDueToday({ ...dueArgs, today: todayISO })) {
      todayDue += 1;
      if (completedByDate.get(todayISO)) todayCompleted += 1;
    }

    if (isHabitDueToday({ ...dueArgs, today: yesterdayISO })) {
      yesterdayDue += 1;
      if (completedByDate.get(yesterdayISO)) yesterdayCompleted += 1;
    }

    if (habit.is_active) {
      const logs: HabitLogEntry[] = [...completedByDate.entries()].map(([logDate, completed]) => ({
        logDate,
        completed,
      }));
      const streak = calculateStreaks({
        logs,
        scheduleWeekdays,
        startDate: habit.start_date,
        today: todayISO,
      });
      if (streak.currentStreak > 0 && (!bestActiveStreak || streak.currentStreak > bestActiveStreak.length)) {
        bestActiveStreak = { habitName: habit.name, length: streak.currentStreak };
      }
    }
  }

  return {
    today: { dueCount: todayDue, completedCount: todayCompleted },
    yesterday: { dueCount: yesterdayDue, completedCount: yesterdayCompleted },
    bestActiveStreak,
  };
}

export async function getUserWaterContext(
  admin: AdminClient,
  userId: string,
  todayISO: string,
): Promise<{ totalMl: number; targetMl: number }> {
  const start = new Date(`${todayISO}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [{ data: logs, error: logsError }, { data: profile, error: profileError }] = await Promise.all([
    admin
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .gte("logged_at", start.toISOString())
      .lt("logged_at", end.toISOString()),
    admin.from("profiles").select("water_daily_target_ml").eq("id", userId).single(),
  ]);
  if (logsError) throw logsError;
  if (profileError) throw profileError;

  return {
    totalMl: (logs ?? []).reduce((sum, log) => sum + log.amount_ml, 0),
    targetMl: profile?.water_daily_target_ml ?? 0,
  };
}

export async function userHasJournalEntryToday(
  admin: AdminClient,
  userId: string,
  todayISO: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_date", todayISO)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
