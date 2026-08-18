import { describe, expect, it } from "vitest";
import { formatMinutes, formatMl } from "./format";

describe("formatMinutes", () => {
  it("shows only minutes under an hour", () => {
    expect(formatMinutes(45)).toBe("45m");
  });

  it("shows only hours on an exact hour", () => {
    expect(formatMinutes(120)).toBe("2h");
  });

  it("shows hours and minutes", () => {
    expect(formatMinutes(452)).toBe("7h 32m");
  });

  it("handles zero", () => {
    expect(formatMinutes(0)).toBe("0m");
  });
});

describe("formatMl", () => {
  it("shows milliliters under a liter", () => {
    expect(formatMl(250)).toBe("250 ml");
  });

  it("shows a whole liter count without decimals", () => {
    expect(formatMl(3000)).toBe("3 L");
  });

  it("shows one decimal for partial liters", () => {
    expect(formatMl(2400)).toBe("2.4 L");
  });
});
