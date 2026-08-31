import { describe, expect, it } from "vitest";
import { expandWeeklyRecurrence, parseIcsFile } from "./ics";

describe("parseIcsFile", () => {
  it("parses a simple timed VEVENT", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "SUMMARY:Team sync",
      "LOCATION:Room 4",
      "DTSTART:20260901T090000Z",
      "DTEND:20260901T093000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const events = parseIcsFile(ics);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Team sync",
      location: "Room 4",
      startAt: "2026-09-01T09:00:00.000Z",
      endAt: "2026-09-01T09:30:00.000Z",
      isAllDay: false,
      recurrence: null,
    });
  });

  it("unfolds a continuation line per RFC 5545", () => {
    const ics = [
      "BEGIN:VEVENT",
      "SUMMARY:Weekly sync",
      "DESCRIPTION:Weekly sync with the",
      "  team.",
      "DTSTART:20260901T090000Z",
      "END:VEVENT",
    ].join("\r\n");

    const events = parseIcsFile(ics);
    expect(events[0].description).toBe("Weekly sync with the team.");
  });

  it("parses an all-day VALUE=DATE event", () => {
    const ics = [
      "BEGIN:VEVENT",
      "SUMMARY:Conference",
      "DTSTART;VALUE=DATE:20260910",
      "DTEND;VALUE=DATE:20260912",
      "END:VEVENT",
    ].join("\n");

    const events = parseIcsFile(ics);
    expect(events[0]).toMatchObject({
      isAllDay: true,
      startAt: "2026-09-10T00:00:00.000Z",
      endAt: "2026-09-12T00:00:00.000Z",
    });
  });

  it("parses multiple VEVENTs in one file", () => {
    const ics = [
      "BEGIN:VEVENT",
      "SUMMARY:First",
      "DTSTART:20260901T090000Z",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "SUMMARY:Second",
      "DTSTART:20260902T090000Z",
      "END:VEVENT",
    ].join("\n");

    const events = parseIcsFile(ics);
    expect(events.map((e) => e.title)).toEqual(["First", "Second"]);
  });

  it("captures a weekly RRULE with BYDAY and UNTIL", () => {
    const ics = [
      "BEGIN:VEVENT",
      "SUMMARY:Standup",
      "DTSTART:20260901T090000Z",
      "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260930T000000Z",
      "END:VEVENT",
    ].join("\n");

    const events = parseIcsFile(ics);
    expect(events[0].recurrence).toEqual({
      interval: 1,
      byDay: [1, 3, 5],
      until: "2026-09-30T00:00:00.000Z",
      count: null,
    });
  });

  it("treats a non-weekly RRULE as no recurrence (imported as a one-off)", () => {
    const ics = [
      "BEGIN:VEVENT",
      "SUMMARY:Birthday",
      "DTSTART;VALUE=DATE:20260915",
      "RRULE:FREQ=YEARLY",
      "END:VEVENT",
    ].join("\n");

    const events = parseIcsFile(ics);
    expect(events[0].recurrence).toBeNull();
  });

  it("skips a VEVENT missing a required SUMMARY or DTSTART", () => {
    const ics = ["BEGIN:VEVENT", "DESCRIPTION:No title or start", "END:VEVENT"].join("\n");
    expect(parseIcsFile(ics)).toHaveLength(0);
  });
});

describe("expandWeeklyRecurrence", () => {
  it("returns just the base event when there's no recurrence", () => {
    const [event] = parseIcsFile(
      ["BEGIN:VEVENT", "SUMMARY:One-off", "DTSTART:20260901T090000Z", "END:VEVENT"].join("\n"),
    );
    expect(expandWeeklyRecurrence(event, "2027-01-01T00:00:00.000Z")).toEqual([
      {
        title: "One-off",
        description: null,
        location: null,
        startAt: "2026-09-01T09:00:00.000Z",
        endAt: null,
        isAllDay: false,
      },
    ]);
  });

  it("expands BYDAY occurrences within the UNTIL bound, preserving time and duration", () => {
    // Tue 2026-09-01, weekly on Mon/Wed/Fri, through end of Sept.
    const [event] = parseIcsFile(
      [
        "BEGIN:VEVENT",
        "SUMMARY:Standup",
        "DTSTART:20260901T090000Z",
        "DTEND:20260901T093000Z",
        "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260911T235959Z",
        "END:VEVENT",
      ].join("\n"),
    );

    const occurrences = expandWeeklyRecurrence(event, "2027-01-01T00:00:00.000Z");
    const dates = occurrences.map((o) => o.startAt.slice(0, 10));
    // Sep 1 (Tue) is the DTSTART itself; only Mon/Wed/Fri on/after it count.
    expect(dates).toEqual(["2026-09-02", "2026-09-04", "2026-09-07", "2026-09-09", "2026-09-11"]);
    for (const o of occurrences) {
      expect(o.startAt.slice(11)).toBe("09:00:00.000Z");
      expect(new Date(o.endAt!).getTime() - new Date(o.startAt).getTime()).toBe(30 * 60 * 1000);
    }
  });

  it("stops at COUNT occurrences when no BYDAY is given (repeats on the start weekday)", () => {
    const [event] = parseIcsFile(
      [
        "BEGIN:VEVENT",
        "SUMMARY:Check-in",
        "DTSTART:20260901T090000Z",
        "RRULE:FREQ=WEEKLY;COUNT=3",
        "END:VEVENT",
      ].join("\n"),
    );

    const occurrences = expandWeeklyRecurrence(event, "2027-01-01T00:00:00.000Z");
    expect(occurrences.map((o) => o.startAt.slice(0, 10))).toEqual([
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
    ]);
  });

  it("is bounded by the caller's windowEnd even without an UNTIL/COUNT", () => {
    const [event] = parseIcsFile(
      ["BEGIN:VEVENT", "SUMMARY:Indefinite", "DTSTART:20260901T090000Z", "RRULE:FREQ=WEEKLY", "END:VEVENT"].join(
        "\n",
      ),
    );

    const occurrences = expandWeeklyRecurrence(event, "2026-09-15T00:00:00.000Z");
    expect(occurrences.length).toBeGreaterThan(0);
    for (const o of occurrences) {
      expect(o.startAt <= "2026-09-15T00:00:00.000Z").toBe(true);
    }
  });
});
