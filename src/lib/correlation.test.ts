import { describe, expect, it } from "vitest";
import { describeCorrelation, pairSamples, pearsonCorrelation } from "./correlation";

describe("pearsonCorrelation", () => {
  it("returns 1 for a perfect positive linear relationship", () => {
    const r = pearsonCorrelation([
      [1, 2],
      [2, 4],
      [3, 6],
      [4, 8],
    ]);
    expect(r).toBeCloseTo(1);
  });

  it("returns -1 for a perfect negative linear relationship", () => {
    const r = pearsonCorrelation([
      [1, 8],
      [2, 6],
      [3, 4],
      [4, 2],
    ]);
    expect(r).toBeCloseTo(-1);
  });

  it("returns null with fewer than 2 samples", () => {
    expect(pearsonCorrelation([])).toBeNull();
    expect(pearsonCorrelation([[1, 1]])).toBeNull();
  });

  it("returns null when one variable is constant (zero variance)", () => {
    const r = pearsonCorrelation([
      [5, 1],
      [5, 2],
      [5, 3],
    ]);
    expect(r).toBeNull();
  });

  it("returns roughly 0 for unrelated data", () => {
    const r = pearsonCorrelation([
      [1, 3],
      [2, 1],
      [3, 4],
      [4, 1],
      [5, 5],
    ]);
    expect(Math.abs(r ?? 1)).toBeLessThan(0.5);
  });
});

describe("pairSamples", () => {
  it("only pairs values present on the same date in both maps", () => {
    const a = new Map([["2026-08-01", 10], ["2026-08-02", 20], ["2026-08-03", 30]]);
    const b = new Map([["2026-08-01", 1], ["2026-08-03", 3]]);
    expect(pairSamples(a, b)).toEqual([
      [10, 1],
      [30, 3],
    ]);
  });

  it("returns an empty array when there's no date overlap", () => {
    const a = new Map([["2026-08-01", 10]]);
    const b = new Map([["2026-08-02", 1]]);
    expect(pairSamples(a, b)).toEqual([]);
  });
});

describe("describeCorrelation", () => {
  it("classifies strength by magnitude and direction by sign", () => {
    expect(describeCorrelation(0.75)).toEqual({ strength: "strong", direction: "positive" });
    expect(describeCorrelation(-0.45)).toEqual({ strength: "moderate", direction: "negative" });
    expect(describeCorrelation(0.31)).toEqual({ strength: "weak", direction: "positive" });
  });
});
