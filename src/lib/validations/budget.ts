import { z } from "zod";
import { PURCHASE_CATEGORY_LABELS } from "@/lib/carbon/categories";

const purchaseCategoryKeys = Object.keys(PURCHASE_CATEGORY_LABELS) as [string, ...string[]];

export const budgetCategorySchema = z.enum(["overall", ...purchaseCategoryKeys]);
export const budgetPeriodSchema = z.enum(["week", "month"]);

const optionalPositiveAmount = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().positive("Budget must be greater than 0.").max(1000000).optional(),
);

export const budgetInputSchema = z
  .object({
    category: budgetCategorySchema,
    weeklyAmount: optionalPositiveAmount,
    monthlyAmount: optionalPositiveAmount,
  })
  .refine((data) => data.weeklyAmount != null || data.monthlyAmount != null, {
    message: "Set a weekly or monthly amount.",
    path: ["weeklyAmount"],
  });

export type BudgetInput = z.infer<typeof budgetInputSchema>;
