import { z } from "zod";
import { PURCHASE_CATEGORY_LABELS } from "@/lib/carbon/categories";

const purchaseCategoryKeys = Object.keys(PURCHASE_CATEGORY_LABELS) as [string, ...string[]];

export const budgetCategorySchema = z.enum(["overall", ...purchaseCategoryKeys]);

export const budgetInputSchema = z.object({
  category: budgetCategorySchema,
  amount: z.coerce.number().positive("Budget must be greater than 0.").max(1000000),
});

export type BudgetInput = z.infer<typeof budgetInputSchema>;
