import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCarbonTotalForRange } from "./carbon-service";
import { buildLifestyleVerdict, type BudgetVerdictTier } from "@/lib/budget-verdict";
import { PURCHASE_CATEGORY_LABELS, type PurchaseCategoryOption } from "@/lib/carbon/categories";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export type BudgetCategory = "overall" | PurchaseCategoryOption;

export async function listBudgets(): Promise<Record<BudgetCategory, number>> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase.from("budgets").select("category, amount").eq("user_id", userId);
  if (error) throw error;

  const budgets = {} as Record<BudgetCategory, number>;
  for (const row of data) budgets[row.category as BudgetCategory] = row.amount;
  return budgets;
}

export async function upsertBudget(category: BudgetCategory, amount: number): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: userId, category, amount, updated_at: new Date().toISOString() },
      { onConflict: "user_id,category" },
    );
  if (error) throw error;
}

export async function deleteBudget(category: BudgetCategory): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("budgets").delete().eq("user_id", userId).eq("category", category);
  if (error) throw error;
}

export type CategorySpending = {
  category: BudgetCategory;
  label: string;
  spentAmount: number;
  co2eKg: number;
  budgetAmount: number | null;
  /** Positive amount over budget; null if under/no budget set. */
  overBy: number | null;
};

export type MonthlyBudgetStatus = {
  overall: CategorySpending;
  categories: CategorySpending[];
  categoriesOverBudget: number;
  categoriesWithBudget: number;
};

function toStatus(category: BudgetCategory, label: string, spent: number, co2e: number, budget: number | null): CategorySpending {
  const overBy = budget != null && spent > budget ? spent - budget : null;
  return { category, label, spentAmount: spent, co2eKg: co2e, budgetAmount: budget, overBy };
}

export async function getMonthlyBudgetStatus(): Promise<MonthlyBudgetStatus> {
  const { supabase, userId } = await requireUserId();
  const startDate = firstOfMonthISO();
  const endDate = todayISO();

  const [{ data: purchases, error: purchasesError }, budgets] = await Promise.all([
    supabase
      .from("carbon_purchase_logs")
      .select("category, amount, co2e_kg")
      .eq("user_id", userId)
      .gte("occurred_at", startDate)
      .lte("occurred_at", endDate),
    listBudgets(),
  ]);
  if (purchasesError) throw purchasesError;

  const spentByCategory = new Map<PurchaseCategoryOption, { amount: number; co2e: number }>();
  let overallSpent = 0;
  let overallCo2e = 0;
  for (const row of purchases) {
    const category = row.category as PurchaseCategoryOption;
    const entry = spentByCategory.get(category) ?? { amount: 0, co2e: 0 };
    entry.amount += row.amount;
    entry.co2e += row.co2e_kg ?? 0;
    spentByCategory.set(category, entry);
    overallSpent += row.amount;
    overallCo2e += row.co2e_kg ?? 0;
  }

  const categories: CategorySpending[] = (Object.keys(PURCHASE_CATEGORY_LABELS) as PurchaseCategoryOption[])
    .map((category) => {
      const spent = spentByCategory.get(category) ?? { amount: 0, co2e: 0 };
      return toStatus(category, PURCHASE_CATEGORY_LABELS[category], spent.amount, spent.co2e, budgets[category] ?? null);
    })
    .filter((c) => c.spentAmount > 0 || c.budgetAmount != null);

  const overall = toStatus("overall", "Overall", overallSpent, overallCo2e, budgets.overall ?? null);
  const categoriesOverBudget = categories.filter((c) => c.overBy != null).length;
  const categoriesWithBudget = categories.filter((c) => c.budgetAmount != null).length;

  return { overall, categories, categoriesOverBudget, categoriesWithBudget };
}

export type LifestyleVerdict = { tier: BudgetVerdictTier; summary: string };

const TREND_WINDOW_DAYS = 30;

export async function getLifestyleVerdict(): Promise<LifestyleVerdict> {
  const [status, thisWindowKg, lastWindowKg] = await Promise.all([
    getMonthlyBudgetStatus(),
    getCarbonTotalForRange(addDaysISO(todayISO(), -(TREND_WINDOW_DAYS - 1)), todayISO()),
    getCarbonTotalForRange(
      addDaysISO(todayISO(), -(TREND_WINDOW_DAYS * 2 - 1)),
      addDaysISO(todayISO(), -TREND_WINDOW_DAYS),
    ),
  ]);

  const carbonChangePct = lastWindowKg > 0 ? ((thisWindowKg - lastWindowKg) / lastWindowKg) * 100 : null;

  return buildLifestyleVerdict({
    categoriesOverBudget: status.categoriesOverBudget,
    categoriesWithBudget: status.categoriesWithBudget,
    carbonChangePct,
  });
}
