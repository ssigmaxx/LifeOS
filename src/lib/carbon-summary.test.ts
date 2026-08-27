import { describe, expect, it } from "vitest";
import { summarizeCarbonActivities } from "./carbon-summary";

describe("summarizeCarbonActivities", () => {
  it("sums co2e by category and overall", () => {
    const result = summarizeCarbonActivities(
      [
        { category: "food", date: "2026-08-20", co2eKg: 2 },
        { category: "travel", date: "2026-08-20", co2eKg: 5 },
        { category: "travel", date: "2026-08-21", co2eKg: 1 },
        { category: "energy", date: "2026-08-21", co2eKg: 3 },
      ],
      { startDate: "2026-08-20", endDate: "2026-08-21" },
    );

    expect(result.totalCo2eKg).toBe(11);
    expect(result.byCategory).toEqual({ food: 2, travel: 6, energy: 3, shopping: 0 });
    expect(result.awaitingCalculationCount).toBe(0);
  });

  it("counts entries without a co2e estimate separately and excludes them from totals", () => {
    const result = summarizeCarbonActivities(
      [
        { category: "travel", date: "2026-08-20", co2eKg: null },
        { category: "food", date: "2026-08-20", co2eKg: 2 },
      ],
      { startDate: "2026-08-20", endDate: "2026-08-20" },
    );

    expect(result.totalCo2eKg).toBe(2);
    expect(result.awaitingCalculationCount).toBe(1);
  });

  it("zero-fills every day in the range, including days with no activity", () => {
    const result = summarizeCarbonActivities(
      [{ category: "food", date: "2026-08-20", co2eKg: 4 }],
      { startDate: "2026-08-19", endDate: "2026-08-21" },
    );

    expect(result.dailySeries).toEqual([
      { date: "2026-08-19", food: 0, travel: 0, energy: 0, shopping: 0 },
      { date: "2026-08-20", food: 4, travel: 0, energy: 0, shopping: 0 },
      { date: "2026-08-21", food: 0, travel: 0, energy: 0, shopping: 0 },
    ]);
  });

  it("returns an empty summary for an empty activity list", () => {
    const result = summarizeCarbonActivities([], { startDate: "2026-08-20", endDate: "2026-08-20" });
    expect(result.totalCo2eKg).toBe(0);
    expect(result.byCategory).toEqual({ food: 0, travel: 0, energy: 0, shopping: 0 });
    expect(result.awaitingCalculationCount).toBe(0);
    expect(result.dailySeries).toHaveLength(1);
  });
});
