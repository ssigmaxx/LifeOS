// Pure carbon-footprint aggregation math. Kept dependency-free (no DB) so
// it's cheap to unit test — carbon-service.ts is responsible for loading
// the raw activity rows and calling this to build the summary the page
// renders. Mirrors the split used by goal-progress.ts / stats.ts.

export type CarbonCategory = "food" | "travel" | "energy" | "shopping";

export const CARBON_CATEGORIES: CarbonCategory[] = ["food", "travel", "energy", "shopping"];

export type CarbonActivity = {
  category: CarbonCategory;
  date: string; // ISO date (yyyy-mm-dd)
  /** null means the emissions estimate hasn't been calculated yet
   * (e.g. no CLIMATIQ_API_KEY configured when it was logged). */
  co2eKg: number | null;
};

export type CarbonDailyPoint = { date: string } & Record<CarbonCategory, number>;

export type CarbonSummary = {
  totalCo2eKg: number;
  byCategory: Record<CarbonCategory, number>;
  awaitingCalculationCount: number;
  /** One point per day in the requested range, ascending, zero-filled. */
  dailySeries: CarbonDailyPoint[];
};

function parseISODate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function emptyCategoryTotals(): Record<CarbonCategory, number> {
  return { food: 0, travel: 0, energy: 0, shopping: 0 };
}

export function summarizeCarbonActivities(
  activities: readonly CarbonActivity[],
  range: { startDate: string; endDate: string },
): CarbonSummary {
  const byCategory = emptyCategoryTotals();
  const byDateAndCategory = new Map<string, Record<CarbonCategory, number>>();
  let totalCo2eKg = 0;
  let awaitingCalculationCount = 0;

  for (const activity of activities) {
    if (activity.co2eKg == null) {
      awaitingCalculationCount += 1;
      continue;
    }
    byCategory[activity.category] += activity.co2eKg;
    totalCo2eKg += activity.co2eKg;

    const dayTotals = byDateAndCategory.get(activity.date) ?? emptyCategoryTotals();
    dayTotals[activity.category] += activity.co2eKg;
    byDateAndCategory.set(activity.date, dayTotals);
  }

  const dailySeries: CarbonDailyPoint[] = [];
  const start = parseISODate(range.startDate);
  const end = parseISODate(range.endDate);
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const date = formatISODate(cursor);
    const totals = byDateAndCategory.get(date) ?? emptyCategoryTotals();
    dailySeries.push({ date, ...totals });
  }

  return { totalCo2eKg, byCategory, awaitingCalculationCount, dailySeries };
}
