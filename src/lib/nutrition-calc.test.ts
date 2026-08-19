import { describe, expect, it } from "vitest";
import {
  bmiCategory,
  buildNutritionPlan,
  calculateBMI,
  calculateBMR,
  calculateCalorieTarget,
  calculateTDEE,
  deriveMacroTargets,
  scaleNutrition,
} from "./nutrition-calc";

describe("calculateBMI", () => {
  it("matches the standard formula", () => {
    expect(calculateBMI(70, 175)).toBeCloseTo(22.857, 2);
  });
});

describe("bmiCategory", () => {
  it("classifies at the WHO boundaries", () => {
    expect(bmiCategory(18.4)).toBe("underweight");
    expect(bmiCategory(18.5)).toBe("normal");
    expect(bmiCategory(24.9)).toBe("normal");
    expect(bmiCategory(25)).toBe("overweight");
    expect(bmiCategory(29.9)).toBe("overweight");
    expect(bmiCategory(30)).toBe("obese");
  });
});

describe("calculateBMR", () => {
  it("matches Mifflin-St Jeor for a male", () => {
    expect(calculateBMR({ sex: "male", weightKg: 70, heightCm: 175, age: 25 })).toBeCloseTo(1673.75, 2);
  });

  it("matches Mifflin-St Jeor for a female (same stats, -166 offset)", () => {
    expect(calculateBMR({ sex: "female", weightKg: 70, heightCm: 175, age: 25 })).toBeCloseTo(1507.75, 2);
  });
});

describe("calculateTDEE", () => {
  it("applies the activity multiplier", () => {
    expect(calculateTDEE(1600, "sedentary")).toBeCloseTo(1920, 5);
    expect(calculateTDEE(1600, "very_active")).toBeCloseTo(3040, 5);
  });
});

describe("calculateCalorieTarget", () => {
  it("targets TDEE exactly for 'maintain'", () => {
    const result = calculateCalorieTarget({ tdee: 2200, sex: "male", goal: "maintain" });
    expect(result.requestedWeeklyRateKg).toBe(0);
    expect(result.dailyCalorieTarget).toBe(2200);
    expect(result.wasClamped).toBe(false);
    expect(result.flags).toHaveLength(0);
  });

  it("computes a deficit from an explicit rate and timeframe", () => {
    // 4kg over 8 weeks = 0.5kg/week = 550 kcal/day deficit (7700*0.5/7)
    const result = calculateCalorieTarget({
      tdee: 2500,
      sex: "male",
      goal: "lose",
      targetWeightChangeKg: 4,
      timeframeWeeks: 8,
    });
    expect(result.requestedWeeklyRateKg).toBeCloseTo(-0.5, 5);
    expect(result.dailyCalorieTarget).toBe(2500 - 550);
    expect(result.wasClamped).toBe(false);
  });

  it("falls back to a conservative default rate when none is given", () => {
    const result = calculateCalorieTarget({ tdee: 2500, sex: "male", goal: "lose" });
    expect(result.requestedWeeklyRateKg).toBeCloseTo(-0.5, 5);
  });

  it("clamps to the safe floor and flags it, for an aggressive deficit on a low TDEE", () => {
    const result = calculateCalorieTarget({
      tdee: 1600,
      sex: "female",
      goal: "lose",
      targetWeightChangeKg: 10,
      timeframeWeeks: 4, // 2.5kg/week — extreme
    });
    expect(result.dailyCalorieTarget).toBe(1200);
    expect(result.wasClamped).toBe(true);
    expect(result.flags.some((f) => f.includes("safe minimum"))).toBe(true);
  });

  it("flags an aggressive loss rate even when it doesn't hit the floor", () => {
    const result = calculateCalorieTarget({
      tdee: 4000,
      sex: "male",
      goal: "lose",
      targetWeightChangeKg: 8,
      timeframeWeeks: 4, // 2kg/week, target well above the floor
    });
    expect(result.wasClamped).toBe(false);
    expect(result.flags.some((f) => f.includes("aggressive"))).toBe(true);
  });

  it("flags an aggressive gain rate", () => {
    const result = calculateCalorieTarget({
      tdee: 2500,
      sex: "male",
      goal: "gain",
      targetWeightChangeKg: 4,
      timeframeWeeks: 4, // 1kg/week gain
    });
    expect(result.flags.some((f) => f.includes("fat rather than lean mass"))).toBe(true);
  });
});

describe("deriveMacroTargets", () => {
  it("derives protein from bodyweight and splits the rest by percentage", () => {
    const macros = deriveMacroTargets(2000, 70);
    expect(macros.proteinG).toBe(112); // 1.6 * 70
    expect(macros.fatG).toBe(56); // 25% of 2000 / 9
    // Remaining calories after protein (rounded) + fat (unrounded 25% share), divided by 4
    const proteinKcal = 112 * 4;
    const fatKcal = 2000 * 0.25;
    const expectedCarbs = Math.round((2000 - proteinKcal - fatKcal) / 4);
    expect(macros.carbsG).toBe(expectedCarbs);
  });

  it("never returns negative carbs even at a very low calorie target", () => {
    const macros = deriveMacroTargets(1200, 100); // protein alone would be 160g = 640kcal
    expect(macros.carbsG).toBeGreaterThanOrEqual(0);
  });
});

describe("buildNutritionPlan", () => {
  it("combines BMI, BMR, TDEE, target, and macros with no flags for an unremarkable adult", () => {
    const plan = buildNutritionPlan({
      age: 30,
      sex: "male",
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      goal: "maintain",
    });
    expect(plan.bmiCategory).toBe("normal");
    expect(plan.flags).toHaveLength(0);
    expect(plan.dailyCalorieTarget).toBe(plan.tdee);
  });

  it("surfaces an age flag for a minor", () => {
    const plan = buildNutritionPlan({
      age: 16,
      sex: "female",
      heightCm: 165,
      weightKg: 55,
      activityLevel: "light",
      goal: "maintain",
    });
    expect(plan.flags.some((f) => f.includes("under 18"))).toBe(true);
  });

  it("surfaces a BMI flag for an underweight person trying to lose more", () => {
    const plan = buildNutritionPlan({
      age: 25,
      sex: "female",
      heightCm: 170,
      weightKg: 50, // BMI ~17.3, underweight
      activityLevel: "sedentary",
      goal: "lose",
      targetWeightChangeKg: 3,
      timeframeWeeks: 6,
    });
    expect(plan.bmiCategory).toBe("underweight");
    expect(plan.flags.some((f) => f.includes("underweight range"))).toBe(true);
  });
});

describe("scaleNutrition", () => {
  it("is the identity at 100g", () => {
    const per100g = { calories: 250, proteinG: 10, carbsG: 30, fatG: 5 };
    expect(scaleNutrition(per100g, 100)).toEqual(per100g);
  });

  it("scales proportionally to the portion size", () => {
    const per100g = { calories: 250, proteinG: 10, carbsG: 30, fatG: 5 };
    expect(scaleNutrition(per100g, 150)).toEqual({ calories: 375, proteinG: 15, carbsG: 45, fatG: 7.5 });
  });
});
