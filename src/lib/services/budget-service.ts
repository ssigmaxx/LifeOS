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

// Sunday-start week, in UTC, matching how the rest of the app treats
// date-only strings elsewhere.
function startOfWeekISO(): string {
  const today = todayISO();
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

export type BudgetPeriod = "week" | "month";
export type BudgetCategory = "overall" | PurchaseCategoryOption;

export type BudgetEntry = { category: BudgetCategory; period: BudgetPeriod; amount: number };

export async function listBudgets(): Promise<BudgetEntry[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase.from("budgets").select("category, period, amount").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => ({
    category: row.category as BudgetCategory,
    period: row.period as BudgetPeriod,
    amount: row.amount,
  }));
}

export async function upsertBudget(category: BudgetCategory, period: BudgetPeriod, amount: number): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: userId, category, period, amount, updated_at: new Date().toISOString() },
      { onConflict: "user_id,category,period" },
    );
  if (error) throw error;
}

export async function deleteBudget(category: BudgetCategory, period: BudgetPeriod): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", userId)
    .eq("category", category)
    .eq("period", period);
  if (error) throw error;
}

export type MonthlyAllocation = {
  overallAmount: number | null;
  categoryAmounts: Partial<Record<PurchaseCategoryOption, number>>;
};

/** The current monthly plan: the overall pot plus how it's split across categories. */
export async function getMonthlyAllocation(): Promise<MonthlyAllocation> {
  const budgets = await listBudgets();
  let overallAmount: number | null = null;
  const categoryAmounts: Partial<Record<PurchaseCategoryOption, number>> = {};
  for (const b of budgets) {
    if (b.period !== "month") continue;
    if (b.category === "overall") overallAmount = b.amount;
    else categoryAmounts[b.category] = b.amount;
  }
  return { overallAmount, categoryAmounts };
}

/** Replaces the whole monthly plan in one go: the overall pot and every category's slice of it. */
export async function saveMonthlyAllocation(
  overallAmount: number | null,
  categoryAmounts: Partial<Record<PurchaseCategoryOption, number>>,
): Promise<void> {
  const writes: Promise<void>[] = [
    overallAmount != null ? upsertBudget("overall", "month", overallAmount) : deleteBudget("overall", "month"),
  ];
  for (const category of Object.keys(PURCHASE_CATEGORY_LABELS) as PurchaseCategoryOption[]) {
    const amount = categoryAmounts[category];
    writes.push(
      amount != null && amount > 0 ? upsertBudget(category, "month", amount) : deleteBudget(category, "month"),
    );
  }
  await Promise.all(writes);
}

export type CategoryBudgetStatus = {
  category: BudgetCategory;
  label: string;
  weekSpent: number;
  weekBudget: number | null;
  weekOverBy: number | null;
  monthSpent: number;
  monthBudget: number | null;
  monthOverBy: number | null;
  /** Month-to-date CO2e for this category. */
  co2eKg: number;
};

export type BudgetStatus = {
  overall: CategoryBudgetStatus;
  categories: CategoryBudgetStatus[];
  categoriesOverBudget: number;
  categoriesWithBudget: number;
};

function overBy(spent: number, budget: number | null): number | null {
  return budget != null && spent > budget ? spent - budget : null;
}

export async function getBudgetStatus(): Promise<BudgetStatus> {
  const { supabase, userId } = await requireUserId();
  const weekStart = startOfWeekISO();
  const monthStart = firstOfMonthISO();
  const rangeStart = weekStart < monthStart ? weekStart : monthStart;
  const today = todayISO();

  const [{ data: purchases, error: purchasesError }, budgets] = await Promise.all([
    supabase
      .from("carbon_purchase_logs")
      .select("category, amount, co2e_kg, occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", rangeStart)
      .lte("occurred_at", today),
    listBudgets(),
  ]);
  if (purchasesError) throw purchasesError;

  const weekBudgetByCategory = new Map<BudgetCategory, number>();
  const monthBudgetByCategory = new Map<BudgetCategory, number>();
  for (const b of budgets) {
    (b.period === "week" ? weekBudgetByCategory : monthBudgetByCategory).set(b.category, b.amount);
  }

  const weekByCategory = new Map<PurchaseCategoryOption, number>();
  const monthByCategory = new Map<PurchaseCategoryOption, number>();
  const co2eByCategory = new Map<PurchaseCategoryOption, number>();
  let weekTotal = 0;
  let monthTotal = 0;
  let co2eTotal = 0;

  for (const row of purchases) {
    const category = row.category as PurchaseCategoryOption;
    if (row.occurred_at >= weekStart) {
      weekByCategory.set(category, (weekByCategory.get(category) ?? 0) + row.amount);
      weekTotal += row.amount;
    }
    if (row.occurred_at >= monthStart) {
      monthByCategory.set(category, (monthByCategory.get(category) ?? 0) + row.amount);
      monthTotal += row.amount;
      const co2e = row.co2e_kg ?? 0;
      co2eByCategory.set(category, (co2eByCategory.get(category) ?? 0) + co2e);
      co2eTotal += co2e;
    }
  }

  const categories: CategoryBudgetStatus[] = (Object.keys(PURCHASE_CATEGORY_LABELS) as PurchaseCategoryOption[])
    .map((category) => {
      const weekSpent = weekByCategory.get(category) ?? 0;
      const monthSpent = monthByCategory.get(category) ?? 0;
      const weekBudget = weekBudgetByCategory.get(category) ?? null;
      const monthBudget = monthBudgetByCategory.get(category) ?? null;
      return {
        category,
        label: PURCHASE_CATEGORY_LABELS[category],
        weekSpent,
        weekBudget,
        weekOverBy: overBy(weekSpent, weekBudget),
        monthSpent,
        monthBudget,
        monthOverBy: overBy(monthSpent, monthBudget),
        co2eKg: co2eByCategory.get(category) ?? 0,
      };
    })
    .filter((c) => c.monthSpent > 0 || c.weekBudget != null || c.monthBudget != null);

  const overallWeekBudget = weekBudgetByCategory.get("overall") ?? null;
  const overallMonthBudget = monthBudgetByCategory.get("overall") ?? null;
  const overall: CategoryBudgetStatus = {
    category: "overall",
    label: "Overall",
    weekSpent: weekTotal,
    weekBudget: overallWeekBudget,
    weekOverBy: overBy(weekTotal, overallWeekBudget),
    monthSpent: monthTotal,
    monthBudget: overallMonthBudget,
    monthOverBy: overBy(monthTotal, overallMonthBudget),
    co2eKg: co2eTotal,
  };

  const categoriesOverBudget = categories.filter((c) => c.weekOverBy != null || c.monthOverBy != null).length;
  const categoriesWithBudget = categories.filter((c) => c.weekBudget != null || c.monthBudget != null).length;

  return { overall, categories, categoriesOverBudget, categoriesWithBudget };
}

export type LifestyleVerdict = { tier: BudgetVerdictTier; summary: string };

const TREND_WINDOW_DAYS = 30;

export async function getLifestyleVerdict(): Promise<LifestyleVerdict> {
  const [status, thisWindowKg, lastWindowKg] = await Promise.all([
    getBudgetStatus(),
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

export type RecentPurchase = {
  id: string;
  category: PurchaseCategoryOption;
  categoryLabel: string;
  amount: number;
  co2eKg: number | null;
  note: string | null;
  purchaseMode: "online" | "offline" | null;
  condition: "new" | "secondhand" | null;
  occurredAt: string;
};

export async function listRecentPurchases(limit = 8): Promise<RecentPurchase[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("carbon_purchase_logs")
    .select("id, category, amount, co2e_kg, note, purchase_mode, condition, occurred_at")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    category: row.category as PurchaseCategoryOption,
    categoryLabel: PURCHASE_CATEGORY_LABELS[row.category as PurchaseCategoryOption],
    amount: row.amount,
    co2eKg: row.co2e_kg,
    note: row.note,
    purchaseMode: row.purchase_mode as "online" | "offline" | null,
    condition: row.condition as "new" | "secondhand" | null,
    occurredAt: row.occurred_at,
  }));
}
