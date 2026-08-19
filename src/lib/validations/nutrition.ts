import { z } from "zod";

export const sexSchema = z.enum(["male", "female"]);
export const activityLevelSchema = z.enum(["sedentary", "light", "moderate", "active", "very_active"]);
export const nutritionGoalSchema = z.enum(["lose", "maintain", "gain"]);

const optionalPositiveNumber = z.preprocess(
  (val) => (val === "" || val == null ? undefined : val),
  z.coerce.number().positive().optional(),
);

export const nutritionProfileInputSchema = z.object({
  age: z.coerce.number().int().min(10, "Age must be at least 10.").max(120, "Age must be at most 120."),
  sex: sexSchema,
  heightCm: z.coerce.number().positive("Height must be greater than 0."),
  weightKg: z.coerce.number().positive("Weight must be greater than 0."),
  activityLevel: activityLevelSchema,
  goal: nutritionGoalSchema,
  targetWeightChangeKg: optionalPositiveNumber,
  timeframeWeeks: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.coerce.number().int().positive().optional(),
  ),
});

export type NutritionProfileInput = z.infer<typeof nutritionProfileInputSchema>;

export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export const foodSourceSchema = z.enum(["open_food_facts", "estimate"]);

export const mealLogInputSchema = z.object({
  mealType: mealTypeSchema,
  foodName: z.string().min(1, "Food name is required.").max(200),
  source: foodSourceSchema,
  quantityGrams: z.coerce.number().positive("Quantity must be greater than 0.").max(5000),
  caloriesPer100g: z.coerce.number().min(0).max(950),
  proteinPer100g: z.coerce.number().min(0).max(100),
  carbsPer100g: z.coerce.number().min(0).max(100),
  fatPer100g: z.coerce.number().min(0).max(100),
});

export type MealLogInput = z.infer<typeof mealLogInputSchema>;

// Validates an already-scaled meal-log proposal at confirm time (the
// client could tamper with the object before confirming) — bounds-checks
// the final values rather than the per-100g inputs, since propose_log_meal
// already did the scaling server-side.
export const mealLogConfirmSchema = z.object({
  mealType: mealTypeSchema,
  foodName: z.string().min(1, "Food name is required.").max(200),
  source: foodSourceSchema,
  quantityGrams: z.coerce.number().positive().max(5000),
  calories: z.coerce.number().min(0).max(10000),
  proteinG: z.coerce.number().min(0).max(2000),
  carbsG: z.coerce.number().min(0).max(2000),
  fatG: z.coerce.number().min(0).max(2000),
  isEstimate: z.boolean(),
});

export type MealLogConfirmInput = z.infer<typeof mealLogConfirmSchema>;
