import { describe, expect, it } from "vitest";
import { estimateNextPeriod } from "./cycle-prediction";

const NO_PREDICTION = {
  nextPeriodStart: null,
  averageCycleLengthDays: null,
  cyclesUsed: 0,
  lastPeriodStart: null,
  ovulationEstimate: null,
  fertileWindowStart: null,
  fertileWindowEnd: null,
  pmsWindowStart: null,
  pmsWindowEnd: null,
};

describe("estimateNextPeriod", () => {
  it("predicts nothing with no logged periods", () => {
    expect(estimateNextPeriod([])).toEqual(NO_PREDICTION);
  });

  it("can't estimate a cycle length from a single logged period", () => {
    const result = estimateNextPeriod(["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(result).toEqual({ ...NO_PREDICTION, lastPeriodStart: "2026-01-01" });
  });

  it("treats a run of consecutive days as one period start", () => {
    // 3-day period starting 01-01, then a 5-day period starting 28 days later.
    const result = estimateNextPeriod([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-29",
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
    expect(result.lastPeriodStart).toBe("2026-01-29");
    expect(result.averageCycleLengthDays).toBe(28);
    expect(result.cyclesUsed).toBe(1);
    expect(result.nextPeriodStart).toBe("2026-02-26");
  });

  it("ignores duplicates and unsorted input the same way", () => {
    const sorted = estimateNextPeriod(["2026-01-01", "2026-01-29"]);
    const shuffledWithDupes = estimateNextPeriod(["2026-01-29", "2026-01-01", "2026-01-01", "2026-01-29"]);
    expect(shuffledWithDupes).toEqual(sorted);
  });

  it("averages the last several plausible cycle lengths", () => {
    // Three 28-day cycles in a row.
    const result = estimateNextPeriod(["2026-01-01", "2026-01-29", "2026-02-26"]);
    expect(result.averageCycleLengthDays).toBe(28);
    expect(result.cyclesUsed).toBe(2);
    expect(result.nextPeriodStart).toBe("2026-03-26");
  });

  it("drops an implausible gap (a likely logging gap) instead of letting it skew the average", () => {
    const result = estimateNextPeriod(["2026-01-01", "2026-01-29", "2026-08-15"]);
    // 01-01 -> 01-29 is a plausible 28-day cycle; 01-29 -> 08-15 (~198 days)
    // is dropped as implausible, so only the first length feeds the average.
    expect(result.averageCycleLengthDays).toBe(28);
    expect(result.cyclesUsed).toBe(1);
    expect(result.lastPeriodStart).toBe("2026-08-15");
    expect(result.nextPeriodStart).toBe("2026-09-12");
  });

  it("derives ovulation, fertile window, and PMS window from the predicted next period", () => {
    // Two 28-day cycles -> nextPeriodStart is 2026-02-26.
    const result = estimateNextPeriod(["2026-01-01", "2026-01-29"]);
    expect(result.nextPeriodStart).toBe("2026-02-26");
    // Ovulation: 14 days before the next period (the stable luteal-phase estimate).
    expect(result.ovulationEstimate).toBe("2026-02-12");
    // Fertile window: 5 days before ovulation through 1 day after.
    expect(result.fertileWindowStart).toBe("2026-02-07");
    expect(result.fertileWindowEnd).toBe("2026-02-13");
    // PMS window: the 5 days immediately before the next period.
    expect(result.pmsWindowStart).toBe("2026-02-21");
    expect(result.pmsWindowEnd).toBe("2026-02-25");
  });
});
