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
import { nutritionProfileInputSchema, mealLogInputSchema } from "@/lib/validations/nutrition";
import { buildNutritionPlan, scaleNutrition } from "@/lib/nutrition-calc";
import { searchOpenFoodFacts } from "@/lib/nutrition/open-food-facts";
import { getDailyTotals, getNutritionProfile } from "@/lib/services/nutrition-service";
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
      "Draft a new goal for the user to review and confirm. Goals are free-form (any name/description) and track progress via milestones the user checks off — not an auto-tracked metric. This never creates anything directly — it only prepares a proposal shown in the UI.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        targetDate: { type: "string", description: "Optional target date, YYYY-MM-DD." },
        milestones: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of milestone titles to pre-populate, e.g. broken-down steps toward the goal.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_nutrition_profile",
    description:
      "Get the user's saved calorie/macro targets (BMR, TDEE, daily calorie target, protein/carbs/fat targets), if they've set one up. Call this before discussing calorie targets so you don't ask for inputs they've already given.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "propose_nutrition_profile",
    description:
      "Compute a daily calorie/macro target from the user's stats and goal, for the user to review and confirm. This never saves anything directly — it only computes and drafts a proposal. Always collect age, sex, height, current weight, and activity level before calling this; ask one concise follow-up question at a time for whichever of these you don't have. Do not do the BMR/TDEE/calorie arithmetic yourself — this tool does it.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        age: { type: "number" },
        sex: { type: "string", enum: ["male", "female"] },
        heightCm: { type: "number" },
        weightKg: { type: "number" },
        activityLevel: {
          type: "string",
          enum: ["sedentary", "light", "moderate", "active", "very_active"],
          description:
            "sedentary = little/no exercise, light = 1-3 days/week, moderate = 3-5 days/week, active = 6-7 days/week, very_active = physical job or 2x/day training.",
        },
        goal: { type: "string", enum: ["lose", "maintain", "gain"] },
        targetWeightChangeKg: {
          type: "number",
          description: "Total desired weight change in kg (positive number). Omit for 'maintain'.",
        },
        timeframeWeeks: {
          type: "number",
          description: "Timeframe in weeks to reach that change. Omit for 'maintain'.",
        },
      },
      required: ["age", "sex", "heightCm", "weightKg", "activityLevel", "goal"],
    },
  },
  {
    name: "search_food",
    description:
      "Search Open Food Facts (Germany) for a branded or packaged food by name. Returns per-100g calories/protein/carbs/fat for up to 5 matches. Use this first for anything packaged; if nothing reasonable comes back, fall back to your own best estimate for the closest German food equivalent and pass source='estimate' to propose_log_meal. If the user hasn't said where they bought it, ask which store (e.g. REWE, Netto, Kaufland, Edeka, Aldi, Lidl, Penny, Rossmann, dm, denn's Biomarkt) before searching — store-specific results tend to match what's actually on their receipt. Store tagging is sparse, so if a store filter returns nothing this falls back to unfiltered results automatically; say so if that happens.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        store: {
          type: "string",
          description: "Optional — one of REWE, Netto, Kaufland, Edeka, Aldi, Lidl, Penny, Rossmann, dm, denn's Biomarkt. Omit if unknown.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "propose_log_meal",
    description:
      "Draft a food log entry for the user to review and confirm — never logs anything directly. Give per-100g macros (either from search_food, or your own estimate for the closest German food equivalent) plus the portion size in grams; this tool scales the macros to the actual portion itself, so give per-100g values, not already-scaled ones.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
        foodName: { type: "string" },
        source: {
          type: "string",
          enum: ["open_food_facts", "estimate"],
          description: "'open_food_facts' only when the numbers came from a search_food match; otherwise 'estimate'.",
        },
        quantityGrams: { type: "number", description: "Portion size actually eaten, in grams." },
        caloriesPer100g: { type: "number" },
        proteinPer100g: { type: "number" },
        carbsPer100g: { type: "number" },
        fatPer100g: { type: "number" },
      },
      required: ["mealType", "foodName", "source", "quantityGrams", "caloriesPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g"],
    },
  },
  {
    name: "get_daily_nutrition_summary",
    description: "Calories and macros logged today (or a given date) versus the user's daily target, plus what's remaining.",
    parametersJsonSchema: {
      type: "object",
      properties: { date: { type: "string", description: "YYYY-MM-DD, defaults to today." } },
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
        description: g.description,
        targetDate: g.targetDate,
        status: g.status,
        milestonesCompleted: g.milestonesCompleted,
        milestonesTotal: g.milestonesTotal,
        progressPercent: Math.round(g.progressRatio * 100),
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
      targetDate: args.targetDate,
    });
    if (!parsed.success) {
      return { forModel: { error: parsed.error.issues[0]?.message ?? "Invalid goal proposal." } };
    }
    const milestones = Array.isArray(args.milestones)
      ? args.milestones.filter((m): m is string => typeof m === "string" && m.trim().length > 0)
      : undefined;
    return {
      forModel: { status: "drafted", summary: `Drafted goal "${parsed.data.name}" for the user to review.` },
      proposal: {
        kind: "goal",
        name: parsed.data.name,
        description: parsed.data.description,
        targetDate: parsed.data.targetDate,
        milestones,
      },
    };
  },

  async get_nutrition_profile() {
    const profile = await getNutritionProfile();
    if (!profile) return { forModel: { hasProfile: false } };
    return {
      forModel: {
        hasProfile: true,
        dailyCalorieTarget: profile.dailyCalorieTarget,
        proteinTargetG: profile.proteinTargetG,
        carbsTargetG: profile.carbsTargetG,
        fatTargetG: profile.fatTargetG,
        bmr: profile.bmr,
        tdee: profile.tdee,
        goal: profile.goal,
      },
    };
  },

  async propose_nutrition_profile(args) {
    const parsed = nutritionProfileInputSchema.safeParse({
      age: args.age,
      sex: args.sex,
      heightCm: args.heightCm,
      weightKg: args.weightKg,
      activityLevel: args.activityLevel,
      goal: args.goal,
      targetWeightChangeKg: args.targetWeightChangeKg,
      timeframeWeeks: args.timeframeWeeks,
    });
    if (!parsed.success) {
      return { forModel: { error: parsed.error.issues[0]?.message ?? "Invalid profile input." } };
    }

    const plan = buildNutritionPlan(parsed.data);

    return {
      forModel: {
        status: "drafted",
        summary: "Computed a calorie/macro target for the user to review. These are estimates from standard formulas, not medical advice.",
        bmi: plan.bmi,
        bmiCategory: plan.bmiCategory,
        bmr: plan.bmr,
        tdee: plan.tdee,
        dailyCalorieTarget: plan.dailyCalorieTarget,
        macroTargets: plan.macroTargets,
        estimatedWeeklyRateKg: plan.realizedWeeklyRateKg,
        wasClamped: plan.wasClamped,
        safetyFlags: plan.flags,
      },
      proposal: {
        kind: "nutrition_profile",
        age: parsed.data.age,
        sex: parsed.data.sex,
        heightCm: parsed.data.heightCm,
        weightKg: parsed.data.weightKg,
        activityLevel: parsed.data.activityLevel,
        goal: parsed.data.goal,
        targetWeightChangeKg: parsed.data.targetWeightChangeKg ?? null,
        timeframeWeeks: parsed.data.timeframeWeeks ?? null,
        bmr: plan.bmr,
        tdee: plan.tdee,
        dailyCalorieTarget: plan.dailyCalorieTarget,
        proteinTargetG: plan.macroTargets.proteinG,
        carbsTargetG: plan.macroTargets.carbsG,
        fatTargetG: plan.macroTargets.fatG,
        bmi: plan.bmi,
        bmiCategory: plan.bmiCategory,
        flags: plan.flags,
      },
    };
  },

  async search_food(args) {
    const query = String(args.query ?? "").trim();
    if (!query) return { forModel: { error: "No search query given." } };
    const store = typeof args.store === "string" && args.store.trim() ? args.store.trim() : undefined;
    const { results, matchedStore } = await searchOpenFoodFacts(query, store);
    if (results.length === 0) {
      return {
        forModel: {
          matches: [],
          note: "No Open Food Facts match found — use your own best estimate for the closest German food equivalent, and pass source='estimate' to propose_log_meal.",
        },
      };
    }
    return {
      forModel: {
        matches: results,
        ...(store && !matchedStore
          ? { note: `No matches tagged for ${store} — these are unfiltered results from all stores instead.` }
          : {}),
      },
    };
  },

  async propose_log_meal(args) {
    const parsed = mealLogInputSchema.safeParse({
      mealType: args.mealType,
      foodName: args.foodName,
      source: args.source,
      quantityGrams: args.quantityGrams,
      caloriesPer100g: args.caloriesPer100g,
      proteinPer100g: args.proteinPer100g,
      carbsPer100g: args.carbsPer100g,
      fatPer100g: args.fatPer100g,
    });
    if (!parsed.success) {
      return { forModel: { error: parsed.error.issues[0]?.message ?? "Invalid meal log." } };
    }

    const scaled = scaleNutrition(
      {
        calories: parsed.data.caloriesPer100g,
        proteinG: parsed.data.proteinPer100g,
        carbsG: parsed.data.carbsPer100g,
        fatG: parsed.data.fatPer100g,
      },
      parsed.data.quantityGrams,
    );
    const isEstimate = parsed.data.source === "estimate";

    return {
      forModel: {
        status: "drafted",
        summary: `Drafted "${parsed.data.foodName}" (${parsed.data.quantityGrams}g) for the user to review.`,
        ...scaled,
        isEstimate,
      },
      proposal: {
        kind: "meal_log",
        mealType: parsed.data.mealType,
        foodName: parsed.data.foodName,
        source: parsed.data.source,
        quantityGrams: parsed.data.quantityGrams,
        calories: scaled.calories,
        proteinG: scaled.proteinG,
        carbsG: scaled.carbsG,
        fatG: scaled.fatG,
        isEstimate,
      },
    };
  },

  async get_daily_nutrition_summary(args) {
    const date = typeof args.date === "string" && args.date ? args.date : todayISO();
    const [totals, profile] = await Promise.all([getDailyTotals(date), getNutritionProfile()]);

    if (!profile) {
      return {
        forModel: {
          date,
          consumed: totals,
          hasTarget: false,
          note: "No calorie target set up yet.",
        },
      };
    }

    return {
      forModel: {
        date,
        consumed: totals,
        hasTarget: true,
        target: {
          calories: profile.dailyCalorieTarget,
          proteinG: profile.proteinTargetG,
          carbsG: profile.carbsTargetG,
          fatG: profile.fatTargetG,
        },
        remaining: {
          calories: profile.dailyCalorieTarget - totals.calories,
          proteinG: Math.round((profile.proteinTargetG - totals.proteinG) * 10) / 10,
          carbsG: Math.round((profile.carbsTargetG - totals.carbsG) * 10) / 10,
          fatG: Math.round((profile.fatTargetG - totals.fatG) * 10) / 10,
        },
      },
    };
  },
};
