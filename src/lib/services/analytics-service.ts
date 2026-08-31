import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  calculateRangeCompletion,
  calculateStreaks,
  isHabitDueToday,
  type HabitLogEntry,
} from "@/lib/streaks";
import {
  calculateWeightedScore,
  getCompletionFraction,
  isLogComplete,
  type TrackingType,
} from "@/lib/habit-completion";
import { average, maxOf, minOf, stdDev } from "@/lib/stats";
import { describeCorrelation, pairSamples, pearsonCorrelation } from "@/lib/correlation";
import { getDailyCarbonTotals } from "@/lib/services/carbon-service";
import { getTodosDueInRange } from "@/lib/services/todo-service";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

export type RangePreset = "7d" | "30d" | "90d" | "6m" | "1y";

export type DateRange = { start: string; end: string };

const RANGE_DAYS: Record<RangePreset, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "6m": 182,
  "1y": 365,
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export function resolveRange(preset: RangePreset): DateRange {
  const end = todayISO();
  const start = isoDaysAgo(RANGE_DAYS[preset] - 1);
  return { start, end };
}

function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  for (let d = startDate; d <= endDate; d = new Date(d.getTime() + 86400000)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ---------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------

export type HabitAnalytics = {
  id: string;
  name: string;
  icon: string | null;
  trackingType: TrackingType;
  currentStreak: number;
  longestStreak: number;
  totalScheduled: number;
  totalCompleted: number;
  completionRate: number;
};

export async function getHabitsAnalytics(range: DateRange): Promise<HabitAnalytics[]> {
  const { supabase, userId } = await requireUserId();

  const { data: habitRows, error: habitsError } = await supabase
    .from("habits")
    .select("id, name, icon, tracking_type, start_date, end_date, is_active")
    .eq("user_id", userId)
    .order("sort_order");
  if (habitsError) throw habitsError;
  if (habitRows.length === 0) return [];

  const habitIds = habitRows.map((h) => h.id);

  // Full history (not range-bounded) — lifetime streaks need it, and
  // calculateRangeCompletion only looks at dates inside [range.start,
  // range.end] anyway, so one query serves both.
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
    const scheduleWeekdays = scheduleByHabit.get(row.id) ?? [];
    const logs: HabitLogEntry[] = (logsByHabit.get(row.id) ?? []).map((log) => ({
      logDate: log.log_date as string,
      completed: isLogComplete(trackingType, {
        valueBoolean: log.value_boolean,
        valueNumeric: log.value_numeric,
        valueSeconds: log.value_seconds,
        targetValueSnapshot: log.target_value_snapshot,
      }),
    }));

    // Bound the range to the habit's own active window so a habit created
    // mid-range isn't penalized for days before it existed.
    const effectiveStart = row.start_date > range.start ? row.start_date : range.start;
    const effectiveEnd =
      row.end_date && row.end_date < range.end ? row.end_date : range.end;

    const completion =
      effectiveStart > effectiveEnd
        ? { totalScheduled: 0, totalCompleted: 0, completionRate: 0 }
        : calculateRangeCompletion({
            logs,
            scheduleWeekdays,
            rangeStart: effectiveStart,
            rangeEnd: effectiveEnd,
          });

    // Streaks are always lifetime, not range-bound — a streak is a live
    // fact about the habit, not a windowed statistic — so this always
    // walks from the habit's actual start_date regardless of the
    // selected analytics range.
    const { currentStreak, longestStreak } = calculateStreaks({
      logs,
      scheduleWeekdays,
      startDate: row.start_date,
      today,
    });

    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      trackingType,
      currentStreak,
      longestStreak,
      totalScheduled: completion.totalScheduled,
      totalCompleted: completion.totalCompleted,
      completionRate: completion.completionRate,
    };
  });
}

// ---------------------------------------------------------------------
// Daily score series (habits-weighted score per day — see
// habit-completion.calculateWeightedScore) — powers the Analytics
// trend chart, the Calendar's color-coded days, and the heatmap.
// ---------------------------------------------------------------------

export type DailyScorePoint = { date: string; score: number | null };

export async function getDailyScoreSeries(range: DateRange): Promise<DailyScorePoint[]> {
  const { supabase, userId } = await requireUserId();

  const [{ data: habitRows, error: habitsError }, todosByDate] = await Promise.all([
    supabase
      .from("habits")
      .select("id, tracking_type, score_weight, is_active, start_date, end_date")
      .eq("user_id", userId),
    getTodosDueInRange(range.start, range.end),
  ]);
  if (habitsError) throw habitsError;

  const dates = enumerateDates(range.start, range.end);
  if (habitRows.length === 0) {
    return dates.map((date) => ({
      date,
      score: calculateWeightedScore(
        (todosByDate.get(date) ?? []).map((t) => ({ fraction: t.completed ? 1 : 0, weight: 1 })),
      ),
    }));
  }

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
        .in("habit_id", habitIds)
        .gte("log_date", range.start)
        .lte("log_date", range.end),
    ]);
  if (scheduleError) throw scheduleError;
  if (logError) throw logError;

  const scheduleByHabit = new Map<string, number[]>();
  for (const row of scheduleRows) {
    const list = scheduleByHabit.get(row.habit_id) ?? [];
    list.push(row.weekday);
    scheduleByHabit.set(row.habit_id, list);
  }

  const logByHabitAndDate = new Map<string, (typeof logRows)[number]>();
  for (const row of logRows) {
    logByHabitAndDate.set(`${row.habit_id}|${row.log_date}`, row);
  }

  return dates.map((date) => {
    const habitEntries = habitRows
      .filter((h) =>
        isHabitDueToday({
          isActive: h.is_active,
          startDate: h.start_date,
          endDate: h.end_date,
          scheduleWeekdays: scheduleByHabit.get(h.id) ?? [],
          today: date,
        }),
      )
      .map((h) => {
        const log = logByHabitAndDate.get(`${h.id}|${date}`);
        const trackingType = h.tracking_type as TrackingType;
        return {
          fraction: log
            ? getCompletionFraction(trackingType, {
                valueBoolean: log.value_boolean,
                valueNumeric: log.value_numeric,
                valueSeconds: log.value_seconds,
                targetValueSnapshot: log.target_value_snapshot,
              })
            : 0,
          weight: h.score_weight,
        };
      });

    const todoEntries = (todosByDate.get(date) ?? []).map((t) => ({
      fraction: t.completed ? 1 : 0,
      weight: 1,
    }));

    return { date, score: calculateWeightedScore([...habitEntries, ...todoEntries]) };
  });
}

// ---------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------

export type SleepAnalytics = {
  avgMinutes: number | null;
  minMinutes: number | null;
  maxMinutes: number | null;
  consistencyMinutes: number | null; // stddev — lower is more consistent
  nightsLogged: number;
};

export async function getSleepAnalytics(range: DateRange): Promise<SleepAnalytics> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("duration_minutes, sleep_end")
    .eq("user_id", userId)
    .gte("sleep_end", `${range.start}T00:00:00.000Z`)
    .lt("sleep_end", `${range.end}T23:59:59.999Z`);
  if (error) throw error;

  const durations = data.map((d) => d.duration_minutes);
  return {
    avgMinutes: average(durations),
    minMinutes: minOf(durations),
    maxMinutes: maxOf(durations),
    consistencyMinutes: stdDev(durations),
    nightsLogged: durations.length,
  };
}

// ---------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------

export type WaterAnalytics = {
  avgMl: number | null;
  targetMl: number;
  targetAchievementRate: number; // 0-1, fraction of days meeting target
  daysLogged: number;
};

export async function getWaterAnalytics(range: DateRange): Promise<WaterAnalytics> {
  const { supabase, userId } = await requireUserId();
  const [{ data: logs, error: logsError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
        .from("water_logs")
        .select("amount_ml, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", `${range.start}T00:00:00.000Z`)
        .lt("logged_at", `${range.end}T23:59:59.999Z`),
      supabase.from("profiles").select("water_daily_target_ml").eq("id", userId).single(),
    ]);
  if (logsError) throw logsError;
  if (profileError) throw profileError;

  const targetMl = profile.water_daily_target_ml;
  const totalsByDate = new Map<string, number>();
  for (const log of logs) {
    const date = log.logged_at.slice(0, 10);
    totalsByDate.set(date, (totalsByDate.get(date) ?? 0) + log.amount_ml);
  }

  const dailyTotals = Array.from(totalsByDate.values());
  const daysHittingTarget = dailyTotals.filter((total) => total >= targetMl).length;

  return {
    avgMl: average(dailyTotals),
    targetMl,
    targetAchievementRate: dailyTotals.length === 0 ? 0 : daysHittingTarget / dailyTotals.length,
    daysLogged: dailyTotals.length,
  };
}

// ---------------------------------------------------------------------
// Fasting
// ---------------------------------------------------------------------

export type FastingAnalytics = {
  avgMinutes: number | null;
  longestMinutes: number | null;
  targetAchievementRate: number; // 0-1, of sessions with a target
  sessionCount: number;
};

export async function getFastingAnalytics(range: DateRange): Promise<FastingAnalytics> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("fasting_sessions")
    .select("start_time, end_time, target_hours")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .gte("start_time", `${range.start}T00:00:00.000Z`)
    .lt("start_time", `${range.end}T23:59:59.999Z`);
  if (error) throw error;

  const sessions = data.map((s) => ({
    minutes: Math.round(
      (new Date(s.end_time!).getTime() - new Date(s.start_time).getTime()) / 60000,
    ),
    targetHours: s.target_hours,
  }));

  const withTarget = sessions.filter((s) => s.targetHours != null);
  const meetingTarget = withTarget.filter((s) => s.minutes >= s.targetHours! * 60);

  return {
    avgMinutes: average(sessions.map((s) => s.minutes)),
    longestMinutes: maxOf(sessions.map((s) => s.minutes)),
    targetAchievementRate: withTarget.length === 0 ? 0 : meetingTarget.length / withTarget.length,
    sessionCount: sessions.length,
  };
}

// ---------------------------------------------------------------------
// Meditation
// ---------------------------------------------------------------------

export type MeditationAnalytics = {
  totalMinutes: number;
  avgSessionMinutes: number | null;
  sessionCount: number;
};

export async function getMeditationAnalytics(range: DateRange): Promise<MeditationAnalytics> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("meditation_sessions")
    .select("duration_minutes")
    .eq("user_id", userId)
    .gte("session_date", range.start)
    .lte("session_date", range.end);
  if (error) throw error;

  const durations = data.map((d) => d.duration_minutes);
  return {
    totalMinutes: durations.reduce((sum, m) => sum + m, 0),
    avgSessionMinutes: average(durations),
    sessionCount: durations.length,
  };
}

// ---------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------

export type WorkoutAnalytics = {
  sessionCount: number;
  totalMinutes: number;
};

export async function getWorkoutAnalytics(range: DateRange): Promise<WorkoutAnalytics> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("workout_logs")
    .select("duration_minutes, completed")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("workout_date", range.start)
    .lte("workout_date", range.end);
  if (error) throw error;

  return {
    sessionCount: data.length,
    totalMinutes: data.reduce((sum, w) => sum + (w.duration_minutes ?? 0), 0),
  };
}

// ---------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------

export type JournalAnalytics = {
  morningCount: number;
  eveningCount: number;
  morningRate: number; // 0-1, of days in range
  eveningRate: number;
  totalDaysInRange: number;
};

export async function getJournalAnalytics(range: DateRange): Promise<JournalAnalytics> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("entry_type")
    .eq("user_id", userId)
    .gte("entry_date", range.start)
    .lte("entry_date", range.end);
  if (error) throw error;

  const totalDaysInRange = enumerateDates(range.start, range.end).length;
  const morningCount = data.filter((e) => e.entry_type === "morning").length;
  const eveningCount = data.filter((e) => e.entry_type === "evening").length;

  return {
    morningCount,
    eveningCount,
    morningRate: totalDaysInRange === 0 ? 0 : morningCount / totalDaysInRange,
    eveningRate: totalDaysInRange === 0 ? 0 : eveningCount / totalDaysInRange,
    totalDaysInRange,
  };
}

// ---------------------------------------------------------------------
// Cross-metric insights — spots simple pairwise relationships between
// things you're already tracking (e.g. "meditation and sleep tend to move
// together"). Deliberately a curated, small set of pairs rather than every
// possible combination: a wall of stats isn't calming, and testing many
// pairs on a small personal dataset makes weak/spurious correlations more
// likely to turn up by chance.
// ---------------------------------------------------------------------

type DailyMetricKey = "sleepMinutes" | "waterMl" | "meditationMinutes" | "workoutCompleted" | "journalMood" | "habitScore" | "carbonKg";

const METRIC_LABELS: Record<DailyMetricKey, string> = {
  sleepMinutes: "Sleep duration",
  waterMl: "Water intake",
  meditationMinutes: "Meditation",
  workoutCompleted: "Workouts",
  journalMood: "Journal mood",
  habitScore: "Daily habit score",
  carbonKg: "Carbon footprint",
};

// Curated, not exhaustive — see note above.
const CANDIDATE_PAIRS: [DailyMetricKey, DailyMetricKey][] = [
  ["sleepMinutes", "habitScore"],
  ["meditationMinutes", "sleepMinutes"],
  ["meditationMinutes", "journalMood"],
  ["workoutCompleted", "journalMood"],
  ["waterMl", "habitScore"],
  ["carbonKg", "habitScore"],
];

const MIN_SAMPLE_SIZE = 7;
const MIN_ABS_CORRELATION = 0.3;
const MAX_INSIGHTS = 4;

export type CrossMetricInsight = {
  metricA: string;
  metricB: string;
  r: number;
  strength: "weak" | "moderate" | "strong";
  direction: "positive" | "negative";
  sampleSize: number;
};

async function getDailyMetricMaps(range: DateRange): Promise<Record<DailyMetricKey, Map<string, number>>> {
  const { supabase, userId } = await requireUserId();

  const [sleep, water, meditation, workout, journal, scoreSeries, carbonKg] = await Promise.all([
    supabase
      .from("sleep_logs")
      .select("duration_minutes, sleep_end")
      .eq("user_id", userId)
      .gte("sleep_end", `${range.start}T00:00:00.000Z`)
      .lt("sleep_end", `${range.end}T23:59:59.999Z`),
    supabase
      .from("water_logs")
      .select("amount_ml, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", `${range.start}T00:00:00.000Z`)
      .lt("logged_at", `${range.end}T23:59:59.999Z`),
    supabase
      .from("meditation_sessions")
      .select("session_date, duration_minutes")
      .eq("user_id", userId)
      .gte("session_date", range.start)
      .lte("session_date", range.end),
    supabase
      .from("workout_logs")
      .select("workout_date, completed")
      .eq("user_id", userId)
      .gte("workout_date", range.start)
      .lte("workout_date", range.end),
    supabase
      .from("journal_entries")
      .select("entry_date, mood")
      .eq("user_id", userId)
      .not("mood", "is", null)
      .gte("entry_date", range.start)
      .lte("entry_date", range.end),
    getDailyScoreSeries(range),
    getDailyCarbonTotals(range),
  ]);
  if (sleep.error) throw sleep.error;
  if (water.error) throw water.error;
  if (meditation.error) throw meditation.error;
  if (workout.error) throw workout.error;
  if (journal.error) throw journal.error;

  const sleepMinutes = new Map<string, number>();
  for (const row of sleep.data) {
    const date = row.sleep_end.slice(0, 10);
    sleepMinutes.set(date, (sleepMinutes.get(date) ?? 0) + row.duration_minutes);
  }

  const waterMl = new Map<string, number>();
  for (const row of water.data) {
    const date = row.logged_at.slice(0, 10);
    waterMl.set(date, (waterMl.get(date) ?? 0) + row.amount_ml);
  }

  const meditationMinutes = new Map<string, number>();
  for (const row of meditation.data) {
    meditationMinutes.set(row.session_date, (meditationMinutes.get(row.session_date) ?? 0) + row.duration_minutes);
  }

  const workoutCompleted = new Map<string, number>();
  for (const row of workout.data) {
    workoutCompleted.set(row.workout_date, row.completed ? 1 : 0);
  }

  const moodSumByDate = new Map<string, { sum: number; count: number }>();
  for (const row of journal.data) {
    const entry = moodSumByDate.get(row.entry_date) ?? { sum: 0, count: 0 };
    entry.sum += row.mood!;
    entry.count += 1;
    moodSumByDate.set(row.entry_date, entry);
  }
  const journalMood = new Map<string, number>();
  for (const [date, { sum, count }] of moodSumByDate) journalMood.set(date, sum / count);

  const habitScore = new Map<string, number>();
  for (const point of scoreSeries) if (point.score != null) habitScore.set(point.date, point.score);

  return { sleepMinutes, waterMl, meditationMinutes, workoutCompleted, journalMood, habitScore, carbonKg };
}

export async function getCrossMetricInsights(range: DateRange): Promise<CrossMetricInsight[]> {
  const maps = await getDailyMetricMaps(range);

  const insights: CrossMetricInsight[] = [];
  for (const [keyA, keyB] of CANDIDATE_PAIRS) {
    const samples = pairSamples(maps[keyA], maps[keyB]);
    if (samples.length < MIN_SAMPLE_SIZE) continue;

    const r = pearsonCorrelation(samples);
    if (r == null || Math.abs(r) < MIN_ABS_CORRELATION) continue;

    const { strength, direction } = describeCorrelation(r);
    insights.push({
      metricA: METRIC_LABELS[keyA],
      metricB: METRIC_LABELS[keyB],
      r,
      strength,
      direction,
      sampleSize: samples.length,
    });
  }

  return insights.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, MAX_INSIGHTS);
}
