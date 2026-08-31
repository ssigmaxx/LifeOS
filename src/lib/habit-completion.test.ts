import { describe, expect, it } from "vitest";
import {
  calculateDailyHabitsScore,
  calculateWeightedScore,
  getCompletionFraction,
  isLogComplete,
} from "./habit-completion";

const emptyLog = {
  valueBoolean: null,
  valueNumeric: null,
  valueSeconds: null,
  targetValueSnapshot: null,
};

describe("isLogComplete", () => {
  it("boolean requires an explicit true", () => {
    expect(isLogComplete("boolean", { ...emptyLog, valueBoolean: true })).toBe(true);
    expect(isLogComplete("boolean", { ...emptyLog, valueBoolean: false })).toBe(false);
    expect(isLogComplete("boolean", emptyLog)).toBe(false);
  });

  it("numeric with no target counts any logged value", () => {
    expect(isLogComplete("numeric", { ...emptyLog, valueNumeric: 0.1 })).toBe(true);
    expect(isLogComplete("numeric", emptyLog)).toBe(false);
  });

  it("numeric with a target requires meeting it", () => {
    const withTarget = { ...emptyLog, targetValueSnapshot: 3 };
    expect(isLogComplete("numeric", { ...withTarget, valueNumeric: 2.9 })).toBe(false);
    expect(isLogComplete("numeric", { ...withTarget, valueNumeric: 3 })).toBe(true);
  });

  it("time treats the target as a latest-by clock time", () => {
    const withTarget = { ...emptyLog, targetValueSnapshot: 7 * 3600 };
    expect(isLogComplete("time", { ...withTarget, valueSeconds: 6 * 3600 })).toBe(true);
    expect(isLogComplete("time", { ...withTarget, valueSeconds: 8 * 3600 })).toBe(false);
  });
});

describe("getCompletionFraction", () => {
  it("gives partial credit for a targeted numeric habit", () => {
    const log = { ...emptyLog, targetValueSnapshot: 3, valueNumeric: 1.5 };
    expect(getCompletionFraction("numeric", log)).toBeCloseTo(0.5);
  });

  it("caps partial credit at 1 even when the target is exceeded", () => {
    const log = { ...emptyLog, targetValueSnapshot: 3, valueNumeric: 6 };
    expect(getCompletionFraction("numeric", log)).toBe(1);
  });

  it("is binary for boolean habits", () => {
    expect(getCompletionFraction("boolean", { ...emptyLog, valueBoolean: true })).toBe(1);
    expect(getCompletionFraction("boolean", { ...emptyLog, valueBoolean: false })).toBe(0);
  });
});

describe("calculateDailyHabitsScore", () => {
  it("returns null when there are no habits to score", () => {
    expect(calculateDailyHabitsScore([])).toBeNull();
  });

  it("weights a large numeric habit the same as a small boolean one", () => {
    // A 3000-unit numeric habit fully missed and a boolean habit fully done,
    // equal weight, should average to 50% — not be swamped by the raw
    // numeric scale.
    const score = calculateDailyHabitsScore([
      {
        trackingType: "numeric",
        scoreWeight: 1,
        log: { ...emptyLog, targetValueSnapshot: 3000, valueNumeric: 0 },
      },
      {
        trackingType: "boolean",
        scoreWeight: 1,
        log: { ...emptyLog, valueBoolean: true },
      },
    ]);
    expect(score).toBeCloseTo(0.5);
  });

  it("treats an unlogged habit as zero credit", () => {
    const score = calculateDailyHabitsScore([
      { trackingType: "boolean", scoreWeight: 1, log: null },
      {
        trackingType: "boolean",
        scoreWeight: 1,
        log: { ...emptyLog, valueBoolean: true },
      },
    ]);
    expect(score).toBeCloseTo(0.5);
  });

  it("respects differing score weights", () => {
    const score = calculateDailyHabitsScore([
      {
        trackingType: "boolean",
        scoreWeight: 3,
        log: { ...emptyLog, valueBoolean: true },
      },
      { trackingType: "boolean", scoreWeight: 1, log: null },
    ]);
    expect(score).toBeCloseTo(0.75);
  });
});

describe("calculateWeightedScore", () => {
  it("returns null for an empty or zero-total-weight entry list", () => {
    expect(calculateWeightedScore([])).toBeNull();
    expect(calculateWeightedScore([{ fraction: 1, weight: 0 }])).toBeNull();
  });

  it("averages fractions weighted by weight", () => {
    const score = calculateWeightedScore([
      { fraction: 1, weight: 1 },
      { fraction: 0, weight: 1 },
    ]);
    expect(score).toBeCloseTo(0.5);
  });

  it("lets todos and habits mix as equally-weighted entries", () => {
    // 2 habits done of 2, 1 todo done of 2 -> 3/4 overall.
    const score = calculateWeightedScore([
      { fraction: 1, weight: 1 },
      { fraction: 1, weight: 1 },
      { fraction: 1, weight: 1 },
      { fraction: 0, weight: 1 },
    ]);
    expect(score).toBeCloseTo(0.75);
  });
});
