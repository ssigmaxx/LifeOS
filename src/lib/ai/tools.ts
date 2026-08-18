import "server-only";
import type { FunctionDeclaration } from "@google/genai";
import { getTodaySummary } from "@/lib/services/today-service";
import { getTodayWater } from "@/lib/services/water-service";
import { getLatestSleep } from "@/lib/services/sleep-service";
import { getCurrentFast, getLastCompletedFast } from "@/lib/services/fasting-service";
import { getTodayMeditation } from "@/lib/services/meditation-service";
import { getTodayWorkout } from "@/lib/services/workout-service";
import { getTodayEntries, listJournalEntries } from "@/lib/services/journal-service";
import { listHabits } from "@/lib/services/habit-service";
import {
  getFastingAnalytics,
  getHabitsAnalytics,
  getMeditationAnalytics,
  getSleepAnalytics,
  getWaterAnalytics,
  getWorkoutAnalytics,
} from "@/lib/services/analytics-service";
import { listGoals } from "@/lib/services/goal-service";
import { habitFormSchema } from "@/lib/validations/habit";
import { goalFormSchema } from "@/lib/validations/goal";
import type { ToolExecutionResult } from "./types";

const dateRangeParams = {
  startDate: { type: "string", description: "Start date, YYYY-MM-DD, inclusive." },
  endDate: { type: "string", description: "End date, YYYY-MM-DD, inclusive." },
};

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "get_today_summary",
    description:
      "Everything logged today: habit completion, water, sleep, fasting, meditation, gym, and journal status.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "get_habits",
    description:
      "List all of the user's habits with their current/longest streak and lifetime completion rate.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "get_habit_statistics",
    description: "Completion rate and streaks for one specific habit over a date range.",
    parametersJsonSchema: {
      type: "object",
      properties: { habitName: { type: "string" }, ...dateRangeParams },
      required: ["habitName", "startDate", "endDate"],
    },
  },
  {
    name: "compare_habits",
    description: "Compare completion rates and streaks across multiple named habits over a date range.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        habitNames: { type: "array", items: { type: "string" } },
        ...dateRangeParams,
      },
      required: ["habitNames", "startDate", "endDate"],
    },
  },
  {
    name: "get_sleep_statistics",
    description: "Average, min, max, and night-to-night consistency of sleep duration over a date range.",
    parametersJsonSchema: { type: "object", properties: dateRangeParams, required: ["startDate", "endDate"] },
  },
  {
    name: "get_water_statistics",
    description: "Average daily water intake and how often the daily target was hit, over a date range.",
    parametersJsonSchema: { type: "object", properties: dateRangeParams, required: ["startDate", "endDate"] },
  },
  {
    name: "get_fasting_statistics",
    description: "Average and longest fast duration, and target achievement rate, over a date range.",
    parametersJsonSchema: { type: "object", properties: dateRangeParams, required: ["startDate", "endDate"] },
  },
  {
    name: "get_meditation_statistics",
    description: "Total and average meditation session duration over a date range.",
    parametersJsonSchema: { type: "object", properties: dateRangeParams, required: ["startDate", "endDate"] },
  },
  {
    name: "get_workout_statistics",
    description: "Gym session count and total duration over a date range.",
    parametersJsonSchema: { type: "object", properties: dateRangeParams, required: ["startDate", "endDate"] },
  },
  {
    name: "get_journal_entries",
    description:
      "Journal entry text and mood over a date range. Only call this when the user's request specifically needs journal content — never for unrelated questions, since journal entries are private.",
    parametersJsonSchema: { type: "object", properties: dateRangeParams, required: ["startDate", "endDate"] },
  },
  {
    name: "get_goals",
    description: "List all of the user's goals with their current progress.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "propose_create_habit",
    description:
      "Draft a new habit for the user to review and confirm. This never creates anything directly — it only prepares a proposal shown in the UI.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        trackingType: {
          type: "string",
          enum: ["boolean", "numeric", "duration", "counter", "time"],
          description:
            "boolean = done/not done, numeric/counter = a measured amount, duration = minutes, time = a clock time.",
        },
        targetValue: { type: "number", description: "Optional target amount, in the habit's own unit." },
        unit: { type: "string", description: "e.g. 'L', 'reps' — only for numeric/counter types." },
        frequency: { type: "string", enum: ["daily", "custom"] },
        weekdays: {
          type: "array",
          items: { type: "number" },
          description: "0=Sunday..6=Saturday. Only used when frequency is 'custom'.",
        },
      },
      required: ["name", "trackingType", "frequency"],
    },
  },
  {
    name: "propose_create_goal",
    description:
      "Draft a new goal for the user to review and confirm. This never creates anything directly — it only prepares a proposal shown in the UI.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        metricType: {
          type: "string",
          enum: ["water_ml", "meditation_minutes", "gym_sessions", "sleep_hours", "fasting_hours"],
        },
        targetValue: { type: "number" },
        frequency: {
          type: "string",
          enum: ["daily", "weekly", "average"],
          description:
            "daily = hit the target every day, weekly = a count of qualifying days per week, average = a running average.",
        },
      },
      required: ["name", "metricType", "targetValue", "frequency"],
    },
  },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolExecutionResult>;

export const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  async get_today_summary() {
    const [habits, water, sleep, fast, lastFast, meditation, workout, journal] = await Promise.all([
      getTodaySummary(),
      getTodayWater(),
      getLatestSleep(),
      getCurrentFast(),
      getLastCompletedFast(),
      getTodayMeditation(),
      getTodayWorkout(),
      getTodayEntries(),
    ]);
    return {
      forModel: {
        date: habits.date,
        habitsScorePercent: habits.score != null ? Math.round(habits.score * 100) : null,
        habitsCompleted: habits.completedCount,
        habitsTotal: habits.totalCount,
        waterMl: water.totalMl,
        waterTargetMl: water.targetMl,
        latestSleepMinutes: sleep?.durationMinutes ?? null,
        currentFastElapsedMinutes: fast
          ? Math.floor((Date.now() - new Date(fast.startTime).getTime()) / 60000)
          : null,
        lastCompletedFastMinutes: lastFast?.durationMinutes ?? null,
        meditationMinutesToday: meditation.totalMinutes,
        workoutDoneToday: !!workout,
        journalMorningLogged: !!journal.morning,
        journalEveningLogged: !!journal.evening,
      },
    };
  },

  async get_habits() {
    const habits = await listHabits();
    return {
      forModel: habits.map((h) => ({
        name: h.name,
        trackingType: h.trackingType,
        active: h.isActive,
        currentStreak: h.streak.currentStreak,
        longestStreak: h.streak.longestStreak,
        lifetimeCompletionRatePercent: Math.round(h.streak.completionRate * 100),
      })),
    };
  },

  async get_habit_statistics(args) {
    const habitName = String(args.habitName ?? "");
    const startDate = String(args.startDate ?? todayISO());
    const endDate = String(args.endDate ?? todayISO());
    const stats = await getHabitsAnalytics({ start: startDate, end: endDate });
    const match = stats.find((h) => h.name.toLowerCase() === habitName.trim().toLowerCase());
    if (!match) {
      return { forModel: { error: `No habit named "${habitName}" was found.` } };
    }
    return {
      forModel: {
        name: match.name,
        completionRatePercent: Math.round(match.completionRate * 100),
        daysCompleted: match.totalCompleted,
        daysScheduled: match.totalScheduled,
        currentStreak: match.currentStreak,
        longestStreak: match.longestStreak,
      },
    };
  },

  async compare_habits(args) {
    const habitNames = Array.isArray(args.habitNames) ? args.habitNames.map(String) : [];
    const startDate = String(args.startDate ?? todayISO());
    const endDate = String(args.endDate ?? todayISO());
    const stats = await getHabitsAnalytics({ start: startDate, end: endDate });
    const needles = habitNames.map((n) => n.trim().toLowerCase());
    const matched = stats.filter((h) => needles.includes(h.name.toLowerCase()));
    return {
      forModel: matched.map((h) => ({
        name: h.name,
        completionRatePercent: Math.round(h.completionRate * 100),
        currentStreak: h.currentStreak,
        longestStreak: h.longestStreak,
      })),
    };
  },

  async get_sleep_statistics(args) {
    const range = { start: String(args.startDate ?? todayISO()), end: String(args.endDate ?? todayISO()) };
    const stats = await getSleepAnalytics(range);
    return {
      forModel: {
        averageHours: stats.avgMinutes != null ? Math.round((stats.avgMinutes / 60) * 10) / 10 : null,
        minHours: stats.minMinutes != null ? Math.round((stats.minMinutes / 60) * 10) / 10 : null,
        maxHours: stats.maxMinutes != null ? Math.round((stats.maxMinutes / 60) * 10) / 10 : null,
        consistencyMinutesStdDev: stats.consistencyMinutes != null ? Math.round(stats.consistencyMinutes) : null,
        nightsLogged: stats.nightsLogged,
      },
    };
  },

  async get_water_statistics(args) {
    const range = { start: String(args.startDate ?? todayISO()), end: String(args.endDate ?? todayISO()) };
    const stats = await getWaterAnalytics(range);
    return {
      forModel: {
        averageMl: stats.avgMl != null ? Math.round(stats.avgMl) : null,
        targetMl: stats.targetMl,
        targetAchievementRatePercent: Math.round(stats.targetAchievementRate * 100),
        daysLogged: stats.daysLogged,
      },
    };
  },

  async get_fasting_statistics(args) {
    const range = { start: String(args.startDate ?? todayISO()), end: String(args.endDate ?? todayISO()) };
    const stats = await getFastingAnalytics(range);
    return {
      forModel: {
        averageHours: stats.avgMinutes != null ? Math.round((stats.avgMinutes / 60) * 10) / 10 : null,
        longestHours: stats.longestMinutes != null ? Math.round((stats.longestMinutes / 60) * 10) / 10 : null,
        targetAchievementRatePercent: Math.round(stats.targetAchievementRate * 100),
        sessionCount: stats.sessionCount,
      },
    };
  },

  async get_meditation_statistics(args) {
    const range = { start: String(args.startDate ?? todayISO()), end: String(args.endDate ?? todayISO()) };
    const stats = await getMeditationAnalytics(range);
    return {
      forModel: {
        totalMinutes: stats.totalMinutes,
        averageSessionMinutes: stats.avgSessionMinutes != null ? Math.round(stats.avgSessionMinutes) : null,
        sessionCount: stats.sessionCount,
      },
    };
  },

  async get_workout_statistics(args) {
    const range = { start: String(args.startDate ?? todayISO()), end: String(args.endDate ?? todayISO()) };
    const stats = await getWorkoutAnalytics(range);
    return { forModel: stats };
  },

  async get_journal_entries(args) {
    const startDate = String(args.startDate ?? todayISO());
    const endDate = String(args.endDate ?? todayISO());
    const entries = await listJournalEntries({ startDate, endDate, limit: 60 });
    return {
      forModel: entries.map((e) => ({
        date: e.entryDate,
        type: e.entryType,
        mood: e.mood,
        text: e.text,
      })),
    };
  },

  async get_goals() {
    const goals = await listGoals();
    return {
      forModel: goals.map((g) => ({
        name: g.name,
        metricType: g.metricType,
        targetValue: g.targetValue,
        frequency: g.frequency,
        status: g.status,
        progressPercent: Math.round(Math.min(g.progressRatio, 1) * 100),
      })),
    };
  },

  async propose_create_habit(args) {
    const parsed = habitFormSchema.safeParse({
      name: args.name,
      description: args.description,
      trackingType: args.trackingType,
      unit: args.unit,
      targetValue: args.targetValue,
      scoreWeight: 1,
      startDate: todayISO(),
      frequency: args.frequency,
      weekdays: args.weekdays,
    });
    if (!parsed.success) {
      return { forModel: { error: parsed.error.issues[0]?.message ?? "Invalid habit proposal." } };
    }
    return {
      forModel: { status: "drafted", summary: `Drafted habit "${parsed.data.name}" for the user to review.` },
      proposal: {
        kind: "habit",
        name: parsed.data.name,
        description: parsed.data.description,
        trackingType: parsed.data.trackingType,
        targetValue: parsed.data.targetValue,
        unit: parsed.data.unit,
        frequency: parsed.data.frequency,
        weekdays: parsed.data.weekdays,
      },
    };
  },

  async propose_create_goal(args) {
    const parsed = goalFormSchema.safeParse({
      name: args.name,
      description: args.description,
      metricType: args.metricType,
      targetValue: args.targetValue,
      frequency: args.frequency,
      startDate: todayISO(),
    });
    if (!parsed.success) {
      return { forModel: { error: parsed.error.issues[0]?.message ?? "Invalid goal proposal." } };
    }
    return {
      forModel: { status: "drafted", summary: `Drafted goal "${parsed.data.name}" for the user to review.` },
      proposal: {
        kind: "goal",
        name: parsed.data.name,
        description: parsed.data.description,
        metricType: parsed.data.metricType,
        targetValue: parsed.data.targetValue,
        frequency: parsed.data.frequency,
      },
    };
  },
};
