import { describe, expect, it } from "vitest";
import { average, maxOf, minOf, stdDev } from "./stats";

describe("average", () => {
  it("returns null for an empty array", () => {
    expect(average([])).toBeNull();
  });
  it("averages values", () => {
    expect(average([1, 2, 3])).toBe(2);
  });
});

describe("minOf/maxOf", () => {
  it("return null for an empty array", () => {
    expect(minOf([])).toBeNull();
    expect(maxOf([])).toBeNull();
  });
  it("find the min and max", () => {
    expect(minOf([5, 1, 9])).toBe(1);
    expect(maxOf([5, 1, 9])).toBe(9);
  });
});

describe("stdDev", () => {
  it("returns null with fewer than 2 samples", () => {
    expect(stdDev([])).toBeNull();
    expect(stdDev([5])).toBeNull();
  });
  it("returns 0 for identical values", () => {
    expect(stdDev([5, 5, 5])).toBe(0);
  });
  it("computes population standard deviation", () => {
    // mean 5, deviations [-2,-1,0,1,2] -> variance 2 -> stddev sqrt(2)
    expect(stdDev([3, 4, 5, 6, 7])).toBeCloseTo(Math.sqrt(2));
  });
});
