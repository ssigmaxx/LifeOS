import { z } from "zod";
import { PURCHASE_CATEGORY_LABELS } from "@/lib/carbon/categories";

const purchaseCategoryKeys = Object.keys(PURCHASE_CATEGORY_LABELS) as [string, ...string[]];

export const budgetCategorySchema = z.enum(["overall", ...purchaseCategoryKeys]);

const optionalPositiveAmount = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().positive("Budget must be greater than 0.").max(1000000).optional(),
);

export const weeklyBudgetInputSchema = z.object({
  category: budgetCategorySchema,
  amount: optionalPositiveAmount,
});

export type WeeklyBudgetInput = z.infer<typeof weeklyBudgetInputSchema>;

export const monthlyAllocationInputSchema = z.object({
  overallAmount: optionalPositiveAmount,
  categoryAmountsJson: z.string(),
});

export type MonthlyAllocationInput = z.infer<typeof monthlyAllocationInputSchema>;
