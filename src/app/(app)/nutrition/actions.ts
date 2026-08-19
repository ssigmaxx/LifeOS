"use server";

import { revalidatePath } from "next/cache";
import { mealLogInputSchema, nutritionProfileInputSchema } from "@/lib/validations/nutrition";
import { buildNutritionPlan, scaleNutrition, type NutritionPlan } from "@/lib/nutrition-calc";
import { deleteMealLog, logMeal, upsertNutritionProfile } from "@/lib/services/nutrition-service";
import { searchOpenFoodFacts, type OpenFoodFactsResult } from "@/lib/nutrition/open-food-facts";

export type FormActionState = { error: string | null };

export type SaveProfileResult = { error: string | null; plan: NutritionPlan | null };

export async function saveNutritionProfileAction(
  _prevState: SaveProfileResult,
  formData: FormData,
): Promise<SaveProfileResult> {
  const parsed = nutritionProfileInputSchema.safeParse({
    age: formData.get("age"),
    sex: formData.get("sex"),
    heightCm: formData.get("heightCm"),
    weightKg: formData.get("weightKg"),
    activityLevel: formData.get("activityLevel"),
    goal: formData.get("goal"),
    targetWeightChangeKg: formData.get("targetWeightChangeKg"),
    timeframeWeeks: formData.get("timeframeWeeks"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", plan: null };
  }

  const plan = buildNutritionPlan(parsed.data);

  try {
    await upsertNutritionProfile({
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
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save.", plan: null };
  }

  revalidatePath("/nutrition");
  revalidatePath("/today");
  return { error: null, plan };
}

export async function searchFoodAction(query: string): Promise<OpenFoodFactsResult[]> {
  return searchOpenFoodFacts(query);
}

export async function logFoodAction(input: unknown): Promise<FormActionState> {
  const parsed = mealLogInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid food entry." };
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

  try {
    await logMeal({
      mealType: parsed.data.mealType,
      foodName: parsed.data.foodName,
      source: parsed.data.source,
      quantityGrams: parsed.data.quantityGrams,
      calories: scaled.calories,
      proteinG: scaled.proteinG,
      carbsG: scaled.carbsG,
      fatG: scaled.fatG,
      isEstimate: parsed.data.source === "estimate",
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to log food." };
  }

  revalidatePath("/nutrition");
  revalidatePath("/today");
  return { error: null };
}

export async function deleteMealLogAction(id: string) {
  await deleteMealLog(id);
  revalidatePath("/nutrition");
  revalidatePath("/today");
}
