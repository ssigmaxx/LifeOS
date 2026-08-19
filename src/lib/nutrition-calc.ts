// Pure calorie/macro math — no DB dependency, so the numbers the AI Coach
// and the manual settings form both show are guaranteed identical and
// independently testable. Gemini is never trusted to do this arithmetic
// itself (see propose_nutrition_profile in ai/tools.ts): it collects the
// inputs, this module computes the plan.
//
// These are estimates from standard public-health formulas, not medical
// advice — every caller is expected to surface that alongside the numbers.

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type NutritionGoal = "lose" | "maintain" | "gain";
export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const KCAL_PER_KG_FAT = 7700;
const MIN_SAFE_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 };
const MAX_SAFE_WEEKLY_LOSS_KG = 1;
const MAX_SAFE_WEEKLY_GAIN_KG = 0.5;
// No rate given for a lose/gain goal — fall back to a conservative default
// rather than guessing an aggressive one.
const DEFAULT_WEEKLY_RATE_KG: Record<Exclude<NutritionGoal, "maintain">, number> = {
  lose: 0.5,
  gain: 0.25,
};

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function calculateBMR(input: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.sex === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export type CalorieTargetInput = {
  tdee: number;
  sex: Sex;
  goal: NutritionGoal;
  targetWeightChangeKg?: number | null;
  timeframeWeeks?: number | null;
};

export type CalorieTargetResult = {
  /** Signed: negative = losing, positive = gaining, 0 = maintain. */
  requestedWeeklyRateKg: number;
  dailyCalorieTarget: number;
  /** The rate the final (possibly floor-clamped) target actually implies. */
  realizedWeeklyRateKg: number;
  wasClamped: boolean;
  flags: string[];
};

export function calculateCalorieTarget(input: CalorieTargetInput): CalorieTargetResult {
  const flags: string[] = [];
  let requestedWeeklyRateKg = 0;

  if (input.goal !== "maintain") {
    if (!input.targetWeightChangeKg || !input.timeframeWeeks) {
      requestedWeeklyRateKg = DEFAULT_WEEKLY_RATE_KG[input.goal];
      if (input.goal === "lose") requestedWeeklyRateKg = -requestedWeeklyRateKg;
    } else {
      const rate = input.targetWeightChangeKg / input.timeframeWeeks;
      requestedWeeklyRateKg = input.goal === "lose" ? -rate : rate;
    }
  }

  const dailyDelta = (requestedWeeklyRateKg * KCAL_PER_KG_FAT) / 7;
  let target = Math.round(input.tdee + dailyDelta);

  const floor = MIN_SAFE_CALORIES[input.sex];
  let wasClamped = false;
  if (target < floor) {
    target = floor;
    wasClamped = true;
    flags.push(
      `Your requested rate would put you below a safe minimum of ${floor} kcal/day, so the target was raised to ${floor} kcal/day instead.`,
    );
  }

  if (input.goal === "lose" && Math.abs(requestedWeeklyRateKg) > MAX_SAFE_WEEKLY_LOSS_KG) {
    flags.push(
      `Losing more than ${MAX_SAFE_WEEKLY_LOSS_KG} kg/week is generally considered aggressive — a longer timeframe is safer, and a clinician's input is recommended.`,
    );
  }
  if (input.goal === "gain" && requestedWeeklyRateKg > MAX_SAFE_WEEKLY_GAIN_KG) {
    flags.push(
      `Gaining more than ${MAX_SAFE_WEEKLY_GAIN_KG} kg/week usually means mostly fat rather than lean mass — consider a longer timeframe.`,
    );
  }

  const realizedWeeklyRateKg = ((target - input.tdee) * 7) / KCAL_PER_KG_FAT;

  return { requestedWeeklyRateKg, dailyCalorieTarget: target, realizedWeeklyRateKg, wasClamped, flags };
}

export type MacroTargets = { proteinG: number; carbsG: number; fatG: number };

export function deriveMacroTargets(calorieTarget: number, weightKg: number): MacroTargets {
  const proteinG = Math.round(1.6 * weightKg);
  const proteinKcal = proteinG * 4;
  const fatKcal = calorieTarget * 0.25;
  const fatG = Math.round(fatKcal / 9);
  const carbsKcal = Math.max(0, calorieTarget - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);
  return { proteinG, carbsG, fatG };
}

function ageFlags(age: number): string[] {
  if (age < 18) {
    return [
      "These estimates are calibrated for adults — for anyone under 18, growth needs differ, and a pediatrician or registered dietitian should guide any calorie target.",
    ];
  }
  return [];
}

function bmiFlags(bmi: number, goal: NutritionGoal): string[] {
  const category = bmiCategory(bmi);
  const flags: string[] = [];
  if (category === "underweight" && goal === "lose") {
    flags.push(
      "This BMI is already in the underweight range — losing more weight isn't advisable without medical guidance.",
    );
  }
  if (category === "obese" && goal === "gain") {
    flags.push("This BMI is in the obese range — a weight-gain goal is worth discussing with a clinician first.");
  }
  return flags;
}

export type NutritionPlanInput = {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  targetWeightChangeKg?: number | null;
  timeframeWeeks?: number | null;
};

export type NutritionPlan = {
  bmi: number;
  bmiCategory: BmiCategory;
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  macroTargets: MacroTargets;
  requestedWeeklyRateKg: number;
  realizedWeeklyRateKg: number;
  wasClamped: boolean;
  flags: string[];
};

/** Single entry point — the AI tool and the manual settings form both call
 * this so the numbers can never disagree between the two surfaces. */
export function buildNutritionPlan(input: NutritionPlanInput): NutritionPlan {
  const bmi = calculateBMI(input.weightKg, input.heightCm);
  const category = bmiCategory(bmi);
  const bmr = calculateBMR(input);
  const tdee = calculateTDEE(bmr, input.activityLevel);
  const calorieResult = calculateCalorieTarget({
    tdee,
    sex: input.sex,
    goal: input.goal,
    targetWeightChangeKg: input.targetWeightChangeKg,
    timeframeWeeks: input.timeframeWeeks,
  });
  const macroTargets = deriveMacroTargets(calorieResult.dailyCalorieTarget, input.weightKg);
  const flags = [...ageFlags(input.age), ...bmiFlags(bmi, input.goal), ...calorieResult.flags];

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory: category,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyCalorieTarget: calorieResult.dailyCalorieTarget,
    macroTargets,
    requestedWeeklyRateKg: Math.round(calorieResult.requestedWeeklyRateKg * 100) / 100,
    realizedWeeklyRateKg: Math.round(calorieResult.realizedWeeklyRateKg * 100) / 100,
    wasClamped: calorieResult.wasClamped,
    flags,
  };
}

export type NutritionPer100g = { calories: number; proteinG: number; carbsG: number; fatG: number };
export type ScaledNutrition = { calories: number; proteinG: number; carbsG: number; fatG: number };

/** Scales per-100g macros to an actual portion. Always done server-side —
 * never trust the model to multiply correctly. */
export function scaleNutrition(per100g: NutritionPer100g, quantityGrams: number): ScaledNutrition {
  const factor = quantityGrams / 100;
  return {
    calories: Math.round(per100g.calories * factor),
    proteinG: Math.round(per100g.proteinG * factor * 10) / 10,
    carbsG: Math.round(per100g.carbsG * factor * 10) / 10,
    fatG: Math.round(per100g.fatG * factor * 10) / 10,
  };
}
