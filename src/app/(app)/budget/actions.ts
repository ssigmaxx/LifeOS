"use server";

import { revalidatePath } from "next/cache";
import { monthlyAllocationInputSchema, weeklyBudgetInputSchema } from "@/lib/validations/budget";
import {
  deleteBudget,
  saveMonthlyAllocation,
  upsertBudget,
  type BudgetCategory,
} from "@/lib/services/budget-service";
import type { PurchaseCategoryOption } from "@/lib/carbon/categories";

export type FormActionState = { error: string | null };

export async function saveWeeklyBudgetAction(input: unknown): Promise<FormActionState> {
  const parsed = weeklyBudgetInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid budget." };
  }
  try {
    const { category, amount } = parsed.data;
    if (amount != null) await upsertBudget(category as BudgetCategory, "week", amount);
    else await deleteBudget(category as BudgetCategory, "week");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save budget." };
  }
  revalidatePath("/budget");
  return { error: null };
}

export async function saveMonthlyAllocationAction(input: unknown): Promise<FormActionState> {
  const parsed = monthlyAllocationInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid budget plan." };
  }
  let categoryAmounts: Partial<Record<PurchaseCategoryOption, number>>;
  try {
    categoryAmounts = JSON.parse(parsed.data.categoryAmountsJson);
  } catch {
    return { error: "Invalid budget plan." };
  }
  try {
    await saveMonthlyAllocation(parsed.data.overallAmount ?? null, categoryAmounts);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save budget plan." };
  }
  revalidatePath("/budget");
  return { error: null };
}
