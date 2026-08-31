import { describe, expect, it } from "vitest";
import { buildLifestyleVerdict } from "./budget-verdict";

describe("buildLifestyleVerdict", () => {
  it("is 'good' when within budget and footprint is flat or down", () => {
    const result = buildLifestyleVerdict({
      categoriesOverBudget: 0,
      categoriesWithBudget: 3,
      carbonChangePct: -12,
    });
    expect(result.tier).toBe("good");
    expect(result.summary).toContain("within budget");
    expect(result.summary).toContain("down 12%");
    expect(result.summary).toContain("good momentum");
  });

  it("is 'needs_attention' when 2+ categories are over budget", () => {
    const result = buildLifestyleVerdict({
      categoriesOverBudget: 2,
      categoriesWithBudget: 3,
      carbonChangePct: 0,
    });
    expect(result.tier).toBe("needs_attention");
    expect(result.summary).toContain("over budget in 2 categories");
    expect(result.summary).toContain("worth a look");
  });

  it("is 'needs_attention' on a steep footprint increase even with no budget overage", () => {
    const result = buildLifestyleVerdict({
      categoriesOverBudget: 0,
      categoriesWithBudget: 1,
      carbonChangePct: 35,
    });
    expect(result.tier).toBe("needs_attention");
    expect(result.summary).toContain("up 35%");
  });

  it("is 'mixed' for a single category over budget with a flat footprint", () => {
    const result = buildLifestyleVerdict({
      categoriesOverBudget: 1,
      categoriesWithBudget: 2,
      carbonChangePct: 2,
    });
    expect(result.tier).toBe("mixed");
    expect(result.summary).toContain("over budget in 1 category");
    expect(result.summary).toContain("about the same");
  });

  it("omits the budget clause entirely when no budgets are set", () => {
    const result = buildLifestyleVerdict({
      categoriesOverBudget: 0,
      categoriesWithBudget: 0,
      carbonChangePct: -10,
    });
    expect(result.summary).not.toContain("budget");
    expect(result.summary.startsWith("Your footprint")).toBe(true);
  });

  it("doesn't claim momentum or concern when there's no prior data to compare", () => {
    const result = buildLifestyleVerdict({
      categoriesOverBudget: 0,
      categoriesWithBudget: 1,
      carbonChangePct: null,
    });
    expect(result.summary).not.toContain("momentum");
    expect(result.summary).not.toContain("worth a look");
    expect(result.summary).toContain("not enough history");
  });
});
