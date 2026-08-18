import { describe, expect, it } from "vitest";
import { calculateGoalProgress } from "./goal-progress";

describe("calculateGoalProgress — daily", () => {
  it("counts days meeting the daily target", () => {
    const result = calculateGoalProgress({
      frequency: "daily",
      target: 3000,
      dailyValues: new Map([
        ["2026-08-01", 3200],
        ["2026-08-02", 2000],
        ["2026-08-03", 3000],
      ]),
      startDate: "2026-08-01",
      today: "2026-08-03",
    });
    expect(result.sampleSize).toBe(3);
    expect(result.displayValue).toBe(2);
    expect(result.progressRatio).toBeCloseTo(2 / 3);
  });

  it("treats an unlogged day as not meeting the target", () => {
    const result = calculateGoalProgress({
      frequency: "daily",
      target: 20,
      dailyValues: new Map([["2026-08-01", 20]]),
      startDate: "2026-08-01",
      today: "2026-08-02",
    });
    expect(result.sampleSize).toBe(2);
    expect(result.displayValue).toBe(1);
    expect(result.progressRatio).toBeCloseTo(0.5);
  });
});

describe("calculateGoalProgress — weekly", () => {
  it("counts qualifying days within the current week only", () => {
    // 2026-08-17 is a Monday, so the week is Sun 08-16 .. Sat 08-22.
    // Goal started well before this week; only this week's days count.
    const result = calculateGoalProgress({
      frequency: "weekly",
      target: 5,
      dailyValues: new Map([
        ["2026-08-10", 1], // last week — must not count
        ["2026-08-16", 1], // Sun, this week
        ["2026-08-17", 1], // Mon
        ["2026-08-18", 0], // Tue, logged but no session
        ["2026-08-19", 1], // Wed
      ]),
      startDate: "2026-08-01",
      today: "2026-08-19",
    });
    expect(result.displayValue).toBe(3);
    expect(result.progressRatio).toBeCloseTo(3 / 5);
  });

  it("does not look before the goal's own start date even within the week", () => {
    const result = calculateGoalProgress({
      frequency: "weekly",
      target: 5,
      dailyValues: new Map([
        ["2026-08-16", 1], // Sun — before start_date, must not count
        ["2026-08-18", 1], // Tue — after start_date
      ]),
      startDate: "2026-08-17", // Monday
      today: "2026-08-19",
    });
    expect(result.displayValue).toBe(1);
  });
});

describe("calculateGoalProgress — average", () => {
  it("averages only the logged days, not the full window", () => {
    const result = calculateGoalProgress({
      frequency: "average",
      target: 7.5,
      dailyValues: new Map([
        ["2026-08-01", 7],
        ["2026-08-03", 8],
        // 08-02 unlogged — must not count as 0 and drag the average down
      ]),
      startDate: "2026-08-01",
      today: "2026-08-03",
    });
    expect(result.sampleSize).toBe(2);
    expect(result.displayValue).toBeCloseTo(7.5);
    expect(result.progressRatio).toBeCloseTo(1);
  });

  it("returns zero progress with no logged days", () => {
    const result = calculateGoalProgress({
      frequency: "average",
      target: 7.5,
      dailyValues: new Map(),
      startDate: "2026-08-01",
      today: "2026-08-03",
    });
    expect(result.sampleSize).toBe(0);
    expect(result.progressRatio).toBe(0);
  });

  it("can exceed 1.0 when overachieving", () => {
    const result = calculateGoalProgress({
      frequency: "average",
      target: 16,
      dailyValues: new Map([["2026-08-01", 20]]),
      startDate: "2026-08-01",
      today: "2026-08-01",
    });
    expect(result.progressRatio).toBeCloseTo(1.25);
  });
});
