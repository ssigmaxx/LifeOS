import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ActivityLevel, NutritionGoal, Sex } from "@/lib/nutrition-calc";

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

export type NutritionProfile = {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  targetWeightChangeKg: number | null;
  timeframeWeeks: number | null;
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
};

function mapProfileRow(row: {
  age: number;
  sex: string;
  height_cm: number;
  weight_kg: number;
  activity_level: string;
  goal: string;
  target_weight_change_kg: number | null;
  timeframe_weeks: number | null;
  bmr: number;
  tdee: number;
  daily_calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
}): NutritionProfile {
  return {
    age: row.age,
    sex: row.sex as Sex,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    activityLevel: row.activity_level as ActivityLevel,
    goal: row.goal as NutritionGoal,
    targetWeightChangeKg: row.target_weight_change_kg,
    timeframeWeeks: row.timeframe_weeks,
    bmr: row.bmr,
    tdee: row.tdee,
    dailyCalorieTarget: row.daily_calorie_target,
    proteinTargetG: row.protein_target_g,
    carbsTargetG: row.carbs_target_g,
    fatTargetG: row.fat_target_g,
  };
}

export async function getNutritionProfile(): Promise<NutritionProfile | null> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("nutrition_profiles")
    .select(
      "age, sex, height_cm, weight_kg, activity_level, goal, target_weight_change_kg, timeframe_weeks, bmr, tdee, daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfileRow(data) : null;
}

export async function upsertNutritionProfile(input: NutritionProfile): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("nutrition_profiles").upsert(
    {
      user_id: userId,
      age: input.age,
      sex: input.sex,
      height_cm: input.heightCm,
      weight_kg: input.weightKg,
      activity_level: input.activityLevel,
      goal: input.goal,
      target_weight_change_kg: input.targetWeightChangeKg,
      timeframe_weeks: input.timeframeWeeks,
      bmr: input.bmr,
      tdee: input.tdee,
      daily_calorie_target: input.dailyCalorieTarget,
      protein_target_g: input.proteinTargetG,
      carbs_target_g: input.carbsTargetG,
      fat_target_g: input.fatTargetG,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodSource = "open_food_facts" | "estimate";

export type FoodLogEntry = {
  id: string;
  logDate: string;
  mealType: MealType;
  foodName: string;
  source: FoodSource;
  quantityGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isEstimate: boolean;
};

function mapLogRow(row: {
  id: string;
  log_date: string;
  meal_type: string;
  food_name: string;
  source: string;
  quantity_grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_estimate: boolean;
}): FoodLogEntry {
  return {
    id: row.id,
    logDate: row.log_date,
    mealType: row.meal_type as MealType,
    foodName: row.food_name,
    source: row.source as FoodSource,
    quantityGrams: row.quantity_grams,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    isEstimate: row.is_estimate,
  };
}

export async function logMeal(input: {
  logDate?: string;
  mealType: MealType;
  foodName: string;
  source: FoodSource;
  quantityGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isEstimate: boolean;
}): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("food_logs").insert({
    user_id: userId,
    log_date: input.logDate ?? todayISO(),
    meal_type: input.mealType,
    food_name: input.foodName,
    source: input.source,
    quantity_grams: input.quantityGrams,
    calories: input.calories,
    protein_g: input.proteinG,
    carbs_g: input.carbsG,
    fat_g: input.fatG,
    is_estimate: input.isEstimate,
  });
  if (error) throw error;
}

export async function deleteMealLog(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("food_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function getDailyLog(date?: string): Promise<FoodLogEntry[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("food_logs")
    .select("id, log_date, meal_type, food_name, source, quantity_grams, calories, protein_g, carbs_g, fat_g, is_estimate")
    .eq("user_id", userId)
    .eq("log_date", date ?? todayISO())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(mapLogRow);
}

export type DailyTotals = { calories: number; proteinG: number; carbsG: number; fatG: number };

export async function getDailyTotals(date?: string): Promise<DailyTotals> {
  const entries = await getDailyLog(date);
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      proteinG: totals.proteinG + entry.proteinG,
      carbsG: totals.carbsG + entry.carbsG,
      fatG: totals.fatG + entry.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
