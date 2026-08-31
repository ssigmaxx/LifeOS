import "server-only";
import { isHabitDueToday } from "@/lib/streaks";
import { calculateWeightedScore, getCompletionFraction, isLogComplete } from "@/lib/habit-completion";
import { getTodayLogs, listHabits, type Habit, type TodayLogValue } from "./habit-service";
import { getTodosDueOnDate, type TodoCompletion } from "./todo-service";

export type TodayHabit = Habit & { todayLog: TodayLogValue | null };

export type TodaySummary = {
  date: string;
  dueHabits: TodayHabit[];
  completedCount: number;
  totalCount: number;
  score: number | null; // 0-1, null when nothing is due/todo today
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Pure — split out from getTodaySummary so callers that already have a
// listHabits() result (e.g. the Dashboard, which also needs the full list
// for streaks) can derive the summary without a second round-trip through
// listHabits()'s three queries. `todosToday` defaults to empty for callers
// that don't need todos folded into the score.
export function summarizeToday(
  habits: Habit[],
  todayLogs: Record<string, TodayLogValue>,
  todosToday: TodoCompletion[] = [],
): TodaySummary {
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

  const habitEntries = dueHabits.map((habit) => ({
    fraction: habit.todayLog ? getCompletionFraction(habit.trackingType, habit.todayLog) : 0,
    weight: habit.scoreWeight,
  }));
  const todoEntries = todosToday.map((todo) => ({ fraction: todo.completed ? 1 : 0, weight: 1 }));
  const score = calculateWeightedScore([...habitEntries, ...todoEntries]);

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

export async function getTodaySummary(): Promise<TodaySummary> {
  const [habits, todayLogs, todosToday] = await Promise.all([listHabits(), getTodayLogs(), getTodosDueOnDate()]);
  return summarizeToday(habits, todayLogs, todosToday);
}
