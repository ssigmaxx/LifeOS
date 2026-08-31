// Pure synthesis of "how's it going" from budget adherence + carbon trend.
// Kept dependency-free (no DB) so it's cheap to unit test — budget-service.ts
// is responsible for computing the inputs (how many categories are over
// budget, and the % change in total footprint vs the prior 30-day window).
//
// Deliberately conservative in what it claims: no attempt to explain *why*
// a footprint moved (that would need real causal analysis this app doesn't
// do), just the two facts — budget status and footprint trend — stated
// plainly, matching the app's terse, non-preachy copy tone elsewhere.

export type BudgetVerdictTier = "good" | "mixed" | "needs_attention";

const FLAT_TREND_THRESHOLD_PCT = 5;
const STEEP_TREND_THRESHOLD_PCT = 20;

export function buildLifestyleVerdict({
  categoriesOverBudget,
  categoriesWithBudget,
  carbonChangePct,
}: {
  categoriesOverBudget: number;
  categoriesWithBudget: number;
  /** (thisWindow - lastWindow) / lastWindow * 100. Null if there's no prior
   * window to compare against yet. */
  carbonChangePct: number | null;
}): { tier: BudgetVerdictTier; summary: string } {
  const isSteepIncrease = carbonChangePct != null && carbonChangePct > STEEP_TREND_THRESHOLD_PCT;
  const isImproving = carbonChangePct != null && carbonChangePct <= -FLAT_TREND_THRESHOLD_PCT;

  let tier: BudgetVerdictTier;
  if (categoriesOverBudget >= 2 || isSteepIncrease) {
    tier = "needs_attention";
  } else if (categoriesOverBudget === 0 && (carbonChangePct == null || carbonChangePct <= 0)) {
    tier = "good";
  } else {
    tier = "mixed";
  }

  const budgetClause =
    categoriesWithBudget === 0
      ? null
      : categoriesOverBudget === 0
        ? "within budget"
        : `over budget in ${categoriesOverBudget} categor${categoriesOverBudget === 1 ? "y" : "ies"}`;

  let carbonClause: string;
  if (carbonChangePct == null) {
    carbonClause = "footprint trend isn't clear yet — not enough history";
  } else if (isImproving) {
    carbonClause = `footprint is down ${Math.round(Math.abs(carbonChangePct))}% from last month`;
  } else if (carbonChangePct >= FLAT_TREND_THRESHOLD_PCT) {
    carbonClause = `footprint is up ${Math.round(carbonChangePct)}% from last month`;
  } else {
    carbonClause = "footprint is about the same as last month";
  }

  // No "good momentum"/"worth a look" flourish when there's no trend data
  // to actually back it up — that would be claiming more than is known.
  const suffix =
    carbonChangePct == null
      ? "."
      : tier === "good"
        ? " — good momentum."
        : tier === "needs_attention"
          ? " — worth a look."
          : ".";
  const summary = budgetClause
    ? `You're ${budgetClause}, and your ${carbonClause}${suffix}`
    : `Your ${carbonClause}${suffix}`;

  return { tier, summary };
}
