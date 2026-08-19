import type { TrackingType } from "@/lib/habit-completion";
import type { GoalFrequency } from "@/lib/goal-progress";
import type { GoalMetricType } from "@/lib/services/goal-service";
import type { ActivityLevel, BmiCategory, NutritionGoal, Sex } from "@/lib/nutrition-calc";
import type { FoodSource, MealType } from "@/lib/services/nutrition-service";

export type HabitProposal = {
  kind: "habit";
  name: string;
  description?: string;
  trackingType: TrackingType;
  targetValue?: number;
  unit?: string;
  frequency: "daily" | "custom";
  weekdays?: number[];
};

export type GoalProposal = {
  kind: "goal";
  name: string;
  description?: string;
  metricType: GoalMetricType;
  targetValue: number;
  frequency: GoalFrequency;
};

export type NutritionProfileProposal = {
  kind: "nutrition_profile";
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
  bmi: number;
  bmiCategory: BmiCategory;
  flags: string[];
};

export type MealLogProposal = {
  kind: "meal_log";
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

export type Proposal = HabitProposal | GoalProposal | NutritionProfileProposal | MealLogProposal;

export type ToolExecutionResult = {
  /** JSON-serializable — sent back to Gemini as the functionResponse. */
  forModel: unknown;
  /** Surfaced to the client UI as a confirmable card; never sent to Gemini
   * beyond the plain confirmation text in forModel. */
  proposal?: Proposal;
};
