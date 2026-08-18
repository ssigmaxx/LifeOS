import "server-only";
import { isHabitDueToday } from "@/lib/streaks";
import { calculateDailyHabitsScore, isLogComplete } from "@/lib/habit-completion";
import { getTodayLogs, listHabits, type Habit, type TodayLogValue } from "./habit-service";

export type TodayHabit = Habit & { todayLog: TodayLogValue | null };

export type TodaySummary = {
  date: string;
  dueHabits: TodayHabit[];
  completedCount: number;
  totalCount: number;
  score: number | null; // 0-1, null when nothing is due today
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodaySummary(): Promise<TodaySummary> {
  const [habits, todayLogs] = await Promise.all([listHabits(), getTodayLogs()]);
  const today = todayISO();

  const dueHabits: TodayHabit[] = habits
    .filter((habit) =>
      isHabitDueToday({
        isActive: habit.isActive,
        startDate: habit.startDate,
        endDate: habit.endDate,
        scheduleWeekdays: habit.scheduleWeekdays,
        today,
      }),
    )
    .map((habit) => ({ ...habit, todayLog: todayLogs[habit.id] ?? null }));

  const score = calculateDailyHabitsScore(
    dueHabits.map((habit) => ({
      trackingType: habit.trackingType,
      scoreWeight: habit.scoreWeight,
      log: habit.todayLog,
    })),
  );

  return {
    date: today,
    dueHabits,
    completedCount: dueHabits.filter(
      (h) => h.todayLog && isLogComplete(h.trackingType, h.todayLog),
    ).length,
    totalCount: dueHabits.length,
    score,
  };
}
