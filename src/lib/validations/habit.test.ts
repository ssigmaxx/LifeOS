import { describe, expect, it } from "vitest";
import { habitFormSchema } from "./habit";

const basePayload = {
  name: "Meditate",
  description: "",
  categoryId: "",
  icon: "",
  trackingType: "boolean" as const,
  unit: "",
  targetValue: "",
  scoreWeight: "1",
  startDate: "2026-08-18",
  frequency: "daily" as const,
  weekdays: [],
};

describe("habitFormSchema", () => {
  it("accepts an empty targetValue (boolean habits never set one)", () => {
    const result = habitFormSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
  });

  it("accepts empty optional text fields from a real FormData submission", () => {
    // formData.get() returns "" for blank inputs and Select's hidden input,
    // never null/undefined — the schema must treat "" as "not provided".
    const result = habitFormSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
      expect(result.data.categoryId).toBeUndefined();
      expect(result.data.targetValue).toBeUndefined();
    }
  });

  it("rejects a zero or negative targetValue when one is actually provided", () => {
    expect(habitFormSchema.safeParse({ ...basePayload, targetValue: "0" }).success).toBe(false);
    expect(habitFormSchema.safeParse({ ...basePayload, targetValue: "-1" }).success).toBe(false);
  });

  it("accepts a valid positive targetValue", () => {
    const result = habitFormSchema.safeParse({ ...basePayload, targetValue: "3" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.targetValue).toBe(3);
  });

  it("requires at least one weekday when frequency is custom", () => {
    const result = habitFormSchema.safeParse({
      ...basePayload,
      frequency: "custom",
      weekdays: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts custom frequency with weekdays selected", () => {
    const result = habitFormSchema.safeParse({
      ...basePayload,
      frequency: "custom",
      weekdays: ["1", "3"],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.weekdays).toEqual([1, 3]);
  });

  it("rejects a missing name", () => {
    expect(habitFormSchema.safeParse({ ...basePayload, name: "" }).success).toBe(false);
  });
});
