"use server";

import { revalidatePath } from "next/cache";
import { budgetInputSchema } from "@/lib/validations/budget";
import { saveBudget, type BudgetCategory } from "@/lib/services/budget-service";

export type FormActionState = { error: string | null };

export async function saveBudgetAction(input: unknown): Promise<FormActionState> {
  const parsed = budgetInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid budget." };
  }
  try {
    const { category, weeklyAmount, monthlyAmount } = parsed.data;
    await saveBudget(category as BudgetCategory, weeklyAmount ?? null, monthlyAmount ?? null);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save budget." };
  }
  revalidatePath("/budget");
  return { error: null };
}
