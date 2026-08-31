"use server";

import { revalidatePath } from "next/cache";
import { budgetInputSchema } from "@/lib/validations/budget";
import { deleteBudget, upsertBudget, type BudgetCategory } from "@/lib/services/budget-service";

export type FormActionState = { error: string | null };

export async function upsertBudgetAction(input: unknown): Promise<FormActionState> {
  const parsed = budgetInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid budget." };
  }
  try {
    await upsertBudget(parsed.data.category as BudgetCategory, parsed.data.amount);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save budget." };
  }
  revalidatePath("/budget");
  return { error: null };
}

export async function deleteBudgetAction(category: BudgetCategory) {
  await deleteBudget(category);
  revalidatePath("/budget");
}
