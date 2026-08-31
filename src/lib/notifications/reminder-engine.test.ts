import { describe, expect, it } from "vitest";
import {
  buildEveningReviewMessage,
  buildHabitReminderMessage,
  buildJournalReminderMessage,
  buildMorningBriefingMessage,
  buildWaterReminderMessage,
  isReminderDue,
} from "./reminder-engine";

describe("isReminderDue", () => {
  it("is not due before the scheduled time", () => {
    expect(
      isReminderDue({
        now: new Date("2026-08-19T19:59:00.000Z"),
        timeUTC: "20:00",
        lastSentDate: null,
      }),
    ).toBe(false);
  });

  it("is due at or after the scheduled time", () => {
    expect(
      isReminderDue({
        now: new Date("2026-08-19T20:00:00.000Z"),
        timeUTC: "20:00",
        lastSentDate: null,
      }),
    ).toBe(true);
    expect(
      isReminderDue({
        now: new Date("2026-08-19T23:00:00.000Z"),
        timeUTC: "20:00",
        lastSentDate: null,
      }),
    ).toBe(true);
  });

  it("is not due again once already sent today", () => {
    expect(
      isReminderDue({
        now: new Date("2026-08-19T20:05:00.000Z"),
        timeUTC: "20:00",
        lastSentDate: "2026-08-19",
      }),
    ).toBe(false);
  });

  it("is due again on a new day even if sent yesterday", () => {
    expect(
      isReminderDue({
        now: new Date("2026-08-20T20:05:00.000Z"),
        timeUTC: "20:00",
        lastSentDate: "2026-08-19",
      }),
    ).toBe(true);
  });
});

describe("buildHabitReminderMessage", () => {
  it("suppresses when nothing is due", () => {
    expect(buildHabitReminderMessage({ dueCount: 0, completedCount: 0 })).toBeNull();
  });

  it("suppresses when everything due is already completed", () => {
    expect(buildHabitReminderMessage({ dueCount: 3, completedCount: 3 })).toBeNull();
  });

  it("reports the remaining count", () => {
    expect(buildHabitReminderMessage({ dueCount: 3, completedCount: 1 })).toContain("2 habits");
    expect(buildHabitReminderMessage({ dueCount: 1, completedCount: 0 })).toContain("1 habit is");
  });
});

describe("buildWaterReminderMessage", () => {
  it("suppresses when the target is already met", () => {
    expect(buildWaterReminderMessage({ totalMl: 3000, targetMl: 3000 })).toBeNull();
    expect(buildWaterReminderMessage({ totalMl: 3200, targetMl: 3000 })).toBeNull();
  });

  it("suppresses when there is no target", () => {
    expect(buildWaterReminderMessage({ totalMl: 0, targetMl: 0 })).toBeNull();
  });

  it("reports the remaining amount", () => {
    expect(buildWaterReminderMessage({ totalMl: 1000, targetMl: 3000 })).toContain("2000ml to go");
  });
});

describe("buildJournalReminderMessage", () => {
  it("suppresses when an entry already exists today", () => {
    expect(buildJournalReminderMessage({ hasEntryToday: true })).toBeNull();
  });

  it("prompts when nothing was logged today", () => {
    expect(buildJournalReminderMessage({ hasEntryToday: false })).not.toBeNull();
  });
});

describe("buildMorningBriefingMessage", () => {
  it("falls back to a plain greeting with no history", () => {
    expect(
      buildMorningBriefingMessage({
        yesterdayCompletedCount: 0,
        yesterdayTotalCount: 0,
        bestStreak: null,
      }),
    ).toBe("Good morning. Have a great day.");
  });

  it("includes yesterday's completion and the best active streak", () => {
    const message = buildMorningBriefingMessage({
      yesterdayCompletedCount: 4,
      yesterdayTotalCount: 5,
      bestStreak: { habitName: "Meditate", length: 7 },
    });
    expect(message).toContain("4/5 habits done");
    expect(message).toContain("Meditate streak: 7 days");
  });

  it("omits a streak of 1 as not worth mentioning", () => {
    const message = buildMorningBriefingMessage({
      yesterdayCompletedCount: 1,
      yesterdayTotalCount: 1,
      bestStreak: { habitName: "Read", length: 1 },
    });
    expect(message).not.toContain("streak");
  });
});

describe("buildEveningReviewMessage", () => {
  const noHabits = { dueCount: 0, completedCount: 0 };
  const noTodos = { dueCount: 0, completedCount: 0 };

  it("handles a day with nothing scheduled", () => {
    expect(buildEveningReviewMessage({ habits: noHabits, todos: noTodos })).toContain(
      "how did today go",
    );
  });

  it("reports habit completion", () => {
    expect(
      buildEveningReviewMessage({ habits: { dueCount: 3, completedCount: 1 }, todos: noTodos }),
    ).toContain("1/3 habits");
  });

  it("reports todo completion alongside habits", () => {
    const message = buildEveningReviewMessage({
      habits: { dueCount: 3, completedCount: 3 },
      todos: { dueCount: 2, completedCount: 1 },
    });
    expect(message).toContain("3/3 habits");
    expect(message).toContain("1/2 todos");
  });

  it("omits a category entirely when nothing was due in it", () => {
    const message = buildEveningReviewMessage({
      habits: noHabits,
      todos: { dueCount: 2, completedCount: 2 },
    });
    expect(message).not.toContain("habits");
    expect(message).toContain("2/2 todos");
  });
});
