import "server-only";
import { getTodaySummary } from "./today-service";
import { getTodosDueOnDate } from "./todo-service";
import { getTodayWater, type TodayWater } from "./water-service";
import { getTodayMeditation, type TodayMeditation } from "./meditation-service";
import { getTodayWorkout, type TodayWorkout } from "./workout-service";
import { getDailyTotals, getNutritionProfile, type DailyTotals, type NutritionProfile } from "./nutrition-service";
import { getTodayCarbonTotal } from "./carbon-service";
import { getTodayEntries, type JournalEntry } from "./journal-service";

export type RecapTimelineEntry =
  | { time: string; kind: "water"; amountMl: number }
  | { time: string; kind: "workout"; workoutType: string | null; durationMinutes: number | null }
  | { time: string; kind: "meditation"; totalMinutes: number; sessionCount: number }
  | { time: string; kind: "journal"; entryType: "morning" | "evening" };

export type DailyRecap = {
  date: string;
  score: number | null;
  habits: { completed: number; total: number };
  todos: { completed: number; total: number };
  water: TodayWater;
  meditation: TodayMeditation;
  workout: TodayWorkout;
  nutrition: { totals: DailyTotals; profile: NutritionProfile | null };
  carbonKg: number;
  journal: { morning: JournalEntry | null; evening: JournalEntry | null };
  summaryLine: string;
  timeline: RecapTimelineEntry[];
};

// Built from timestamps already available on today's logs (only these four
// domains expose one) — a real chronological feed, not every domain that
// has a count above, and sorted since logs across tables aren't in order.
function buildTimeline({
  water,
  meditation,
  workout,
  journal,
}: {
  water: TodayWater;
  meditation: TodayMeditation;
  workout: TodayWorkout;
  journal: { morning: JournalEntry | null; evening: JournalEntry | null };
}): RecapTimelineEntry[] {
  const entries: RecapTimelineEntry[] = [];

  for (const log of water.logs) {
    entries.push({ time: log.loggedAt, kind: "water", amountMl: log.amountMl });
  }
  if (workout) {
    entries.push({
      time: workout.loggedAt,
      kind: "workout",
      workoutType: workout.workoutType,
      durationMinutes: workout.durationMinutes,
    });
  }
  if (meditation.lastLoggedAt) {
    entries.push({
      time: meditation.lastLoggedAt,
      kind: "meditation",
      totalMinutes: meditation.totalMinutes,
      sessionCount: meditation.sessionCount,
    });
  }
  if (journal.morning) entries.push({ time: journal.morning.createdAt, kind: "journal", entryType: "morning" });
  if (journal.evening) entries.push({ time: journal.evening.createdAt, kind: "journal", entryType: "evening" });

  return entries.sort((a, b) => a.time.localeCompare(b.time));
}

function buildSummaryLine(habits: { completed: number; total: number }, todos: { completed: number; total: number }): string {
  const parts: string[] = [];
  if (habits.total > 0) parts.push(`${habits.completed}/${habits.total} habits`);
  if (todos.total > 0) parts.push(`${todos.completed}/${todos.total} todos`);
  if (parts.length === 0) return "Nothing tracked today yet.";
  return `${parts.join(", ")} done today.`;
}

// Today-scoped only, not a generic per-date recap — matching the literal
// "end of each day" ask rather than refactoring every lifestyle service to
// take an arbitrary date. Mostly composition of getters that already exist
// per domain, not new queries.
export async function getDailyRecap(): Promise<DailyRecap> {
  const [today, todosToday, water, meditation, workout, nutritionTotals, nutritionProfile, carbonKg, journal] =
    await Promise.all([
      getTodaySummary(),
      getTodosDueOnDate(),
      getTodayWater(),
      getTodayMeditation(),
      getTodayWorkout(),
      getDailyTotals(),
      getNutritionProfile(),
      getTodayCarbonTotal(),
      getTodayEntries(),
    ]);

  const habits = { completed: today.completedCount, total: today.totalCount };
  const todos = {
    completed: todosToday.filter((t) => t.completed).length,
    total: todosToday.length,
  };

  return {
    date: today.date,
    score: today.score,
    habits,
    todos,
    water,
    meditation,
    workout,
    nutrition: { totals: nutritionTotals, profile: nutritionProfile },
    carbonKg: carbonKg.totalCo2eKg,
    journal,
    summaryLine: buildSummaryLine(habits, todos),
    timeline: buildTimeline({ water, meditation, workout, journal }),
  };
}
