import { describe, expect, it } from "vitest";
import {
  calculateRangeCompletion,
  calculateStreaks,
  isHabitDueToday,
  isScheduledOn,
} from "./streaks";

describe("isScheduledOn", () => {
  it("treats an empty/undefined schedule as every day", () => {
    const monday = new Date(Date.UTC(2026, 7, 17)); // 2026-08-17 is a Monday
    expect(isScheduledOn(monday, null)).toBe(true);
    expect(isScheduledOn(monday, [])).toBe(true);
  });

  it("matches only the configured weekdays", () => {
    const monday = new Date(Date.UTC(2026, 7, 17));
    const tuesday = new Date(Date.UTC(2026, 7, 18));
    expect(isScheduledOn(monday, [1])).toBe(true); // 1 = Monday
    expect(isScheduledOn(tuesday, [1])).toBe(false);
  });
});

describe("calculateStreaks", () => {
  it("returns all zeros with no logs", () => {
    const result = calculateStreaks({
      logs: [],
      scheduleWeekdays: null,
      startDate: "2026-08-01",
      today: "2026-08-05",
    });
    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalScheduled: 5,
      totalCompleted: 0,
      completionRate: 0,
    });
  });

  it("counts an unbroken daily streak up to today", () => {
    const result = calculateStreaks({
      logs: [
        { logDate: "2026-08-01", completed: true },
        { logDate: "2026-08-02", completed: true },
        { logDate: "2026-08-03", completed: true },
      ],
      scheduleWeekdays: null,
      startDate: "2026-08-01",
      today: "2026-08-03",
    });
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.completionRate).toBe(1);
  });

  it("does not let today's un-logged status break the current streak", () => {
    // Today (08-04) has no log yet, but the day isn't over.
    const result = calculateStreaks({
      logs: [
        { logDate: "2026-08-01", completed: true },
        { logDate: "2026-08-02", completed: true },
        { logDate: "2026-08-03", completed: true },
      ],
      scheduleWeekdays: null,
      startDate: "2026-08-01",
      today: "2026-08-04",
    });
    expect(result.currentStreak).toBe(3);
  });

  it("breaks the current streak on a genuinely missed scheduled day", () => {
    const result = calculateStreaks({
      logs: [
        { logDate: "2026-08-01", completed: true },
        { logDate: "2026-08-02", completed: false },
        { logDate: "2026-08-03", completed: true },
      ],
      scheduleWeekdays: null,
      startDate: "2026-08-01",
      today: "2026-08-03",
    });
    expect(result.currentStreak).toBe(1); // just 08-03
    expect(result.longestStreak).toBe(1);
  });

  it("never counts an unscheduled day as missed", () => {
    // Habit scheduled Mon/Wed/Fri only. 2026-08-17 is a Monday.
    // Tue/Thu logs are absent but must not break the streak.
    const scheduleWeekdays = [1, 3, 5]; // Mon, Wed, Fri
    const result = calculateStreaks({
      logs: [
        { logDate: "2026-08-17", completed: true }, // Mon
        { logDate: "2026-08-19", completed: true }, // Wed
        { logDate: "2026-08-21", completed: true }, // Fri
      ],
      scheduleWeekdays,
      startDate: "2026-08-17",
      today: "2026-08-21",
    });
    expect(result.totalScheduled).toBe(3);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it("keeps the historical longest streak after a later gap drops the current streak", () => {
    const result = calculateStreaks({
      logs: [
        { logDate: "2026-08-01", completed: true },
        { logDate: "2026-08-02", completed: true },
        { logDate: "2026-08-03", completed: true },
        { logDate: "2026-08-04", completed: true },
        { logDate: "2026-08-05", completed: false },
        { logDate: "2026-08-06", completed: true },
      ],
      scheduleWeekdays: null,
      startDate: "2026-08-01",
      today: "2026-08-06",
    });
    expect(result.longestStreak).toBe(4);
    expect(result.currentStreak).toBe(1);
  });

  it("computes completion rate only over scheduled days", () => {
    const scheduleWeekdays = [1, 3, 5]; // Mon, Wed, Fri
    const result = calculateStreaks({
      logs: [
        { logDate: "2026-08-17", completed: true }, // Mon
        { logDate: "2026-08-19", completed: false }, // Wed
        { logDate: "2026-08-21", completed: true }, // Fri
      ],
      scheduleWeekdays,
      startDate: "2026-08-17",
      today: "2026-08-21",
    });
    expect(result.totalScheduled).toBe(3);
    expect(result.totalCompleted).toBe(2);
    expect(result.completionRate).toBeCloseTo(2 / 3);
  });
});

describe("isHabitDueToday", () => {
  const base = {
    isActive: true,
    startDate: "2026-08-01",
    endDate: null as string | null,
    scheduleWeekdays: null as number[] | null,
  };

  it("is due today for an active daily habit within range", () => {
    expect(isHabitDueToday({ ...base, today: "2026-08-17" })).toBe(true);
  });

  it("is not due when paused", () => {
    expect(isHabitDueToday({ ...base, isActive: false, today: "2026-08-17" })).toBe(false);
  });

  it("is not due before the start date", () => {
    expect(isHabitDueToday({ ...base, startDate: "2026-08-20", today: "2026-08-17" })).toBe(
      false,
    );
  });

  it("is not due after the end date", () => {
    expect(
      isHabitDueToday({ ...base, endDate: "2026-08-10", today: "2026-08-17" }),
    ).toBe(false);
  });

  it("respects the weekday schedule", () => {
    // 2026-08-17 is a Monday.
    expect(
      isHabitDueToday({ ...base, scheduleWeekdays: [2, 4], today: "2026-08-17" }),
    ).toBe(false);
    expect(
      isHabitDueToday({ ...base, scheduleWeekdays: [1], today: "2026-08-17" }),
    ).toBe(true);
  });
});

describe("calculateRangeCompletion", () => {
  it("returns all zeros for an empty range with no schedule overlap", () => {
    const result = calculateRangeCompletion({
      logs: [],
      scheduleWeekdays: null,
      rangeStart: "2026-08-01",
      rangeEnd: "2026-08-05",
    });
    expect(result).toEqual({ totalScheduled: 5, totalCompleted: 0, completionRate: 0 });
  });

  it("does not apply today-leniency — an unlogged day within range counts as missed", () => {
    const result = calculateRangeCompletion({
      logs: [{ logDate: "2026-08-01", completed: true }],
      scheduleWeekdays: null,
      rangeStart: "2026-08-01",
      rangeEnd: "2026-08-02",
    });
    expect(result.totalScheduled).toBe(2);
    expect(result.totalCompleted).toBe(1);
    expect(result.completionRate).toBeCloseTo(0.5);
  });

  it("only counts scheduled weekdays within the range", () => {
    // Mon/Wed/Fri only. 2026-08-17 (Mon) through 2026-08-23 (Sun).
    const result = calculateRangeCompletion({
      logs: [
        { logDate: "2026-08-17", completed: true }, // Mon
        { logDate: "2026-08-19", completed: true }, // Wed
        { logDate: "2026-08-21", completed: false }, // Fri, logged but not complete
      ],
      scheduleWeekdays: [1, 3, 5],
      rangeStart: "2026-08-17",
      rangeEnd: "2026-08-23",
    });
    expect(result.totalScheduled).toBe(3);
    expect(result.totalCompleted).toBe(2);
    expect(result.completionRate).toBeCloseTo(2 / 3);
  });
});
