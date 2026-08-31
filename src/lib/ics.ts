// Minimal RFC 5545 (iCalendar) parser, scoped to exactly what LifeOS needs:
// VEVENT title/description/location/start/end (including all-day
// VALUE=DATE events) and RRULE recurrence limited to FREQ=WEEKLY. This is
// deliberately not a general-purpose ICS library — no VTIMEZONE
// resolution (non-UTC/floating times are read as-is, not converted), no
// EXDATE exclusions, and any RRULE that isn't weekly is imported as a
// single one-off occurrence rather than rejected, so nothing in an
// imported file silently disappears.

export type ParsedIcsEvent = {
  title: string;
  description: string | null;
  location: string | null;
  startAt: string; // ISO 8601
  endAt: string | null;
  isAllDay: boolean;
};

export type WeeklyRecurrence = {
  interval: number;
  /** 0=Sunday..6=Saturday (matches Date#getUTCDay). Null means "same
   * weekday as the start date". */
  byDay: number[] | null;
  until: string | null; // ISO 8601, inclusive
  count: number | null;
};

export type ParsedIcsCalendarEvent = ParsedIcsEvent & {
  recurrence: WeeklyRecurrence | null;
};

const BYDAY_TO_WEEKDAY: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function unfoldLines(text: string): string[] {
  const rawLines = text.split(/\r\n|\r|\n/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else if (line.length > 0) {
      lines.push(line);
    }
  }
  return lines;
}

type PropertyLine = { name: string; params: Record<string, string>; value: string };

function parsePropertyLine(line: string): PropertyLine {
  const colonIndex = line.indexOf(":");
  const head = colonIndex === -1 ? line : line.slice(0, colonIndex);
  const value = colonIndex === -1 ? "" : line.slice(colonIndex + 1);

  const [name, ...paramParts] = head.split(";");
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const [key, val] = part.split("=");
    if (key && val) params[key.toUpperCase()] = val;
  }

  return { name: name.toUpperCase(), params, value };
}

/** "20260901" or "20260901T090000" or "20260901T090000Z" -> ISO 8601.
 * Non-UTC/floating times are read as their literal clock time (no
 * VTIMEZONE resolution) — a documented simplification, not a bug. */
function parseDateTimeValue(value: string, isDate: boolean): string {
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  if (isDate) return `${year}-${month}-${day}T00:00:00.000Z`;

  const hour = value.slice(9, 11) || "00";
  const minute = value.slice(11, 13) || "00";
  const second = value.slice(13, 15) || "00";
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}

function parseRRule(value: string): WeeklyRecurrence | null {
  const parts: Record<string, string> = {};
  for (const pair of value.split(";")) {
    const [key, val] = pair.split("=");
    if (key && val) parts[key.toUpperCase()] = val;
  }

  if (parts.FREQ !== "WEEKLY") return null;

  return {
    interval: parts.INTERVAL ? Math.max(1, parseInt(parts.INTERVAL, 10)) : 1,
    byDay: parts.BYDAY
      ? parts.BYDAY.split(",")
          .map((d) => BYDAY_TO_WEEKDAY[d.trim().slice(-2)])
          .filter((d): d is number => d != null)
      : null,
    until: parts.UNTIL ? parseDateTimeValue(parts.UNTIL, parts.UNTIL.length === 8) : null,
    count: parts.COUNT ? parseInt(parts.COUNT, 10) : null,
  };
}

export function parseIcsFile(text: string): ParsedIcsCalendarEvent[] {
  const lines = unfoldLines(text);
  const events: ParsedIcsCalendarEvent[] = [];

  let inEvent = false;
  let current: {
    summary: string | null;
    description: string | null;
    location: string | null;
    startAt: string | null;
    endAt: string | null;
    isAllDay: boolean;
    recurrence: WeeklyRecurrence | null;
  } | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {
        summary: null,
        description: null,
        location: null,
        startAt: null,
        endAt: null,
        isAllDay: false,
        recurrence: null,
      };
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.summary && current.startAt) {
        events.push({
          title: current.summary,
          description: current.description,
          location: current.location,
          startAt: current.startAt,
          endAt: current.endAt,
          isAllDay: current.isAllDay,
          recurrence: current.recurrence,
        });
      }
      inEvent = false;
      current = null;
      continue;
    }
    if (!inEvent || !current) continue;

    const prop = parsePropertyLine(line);
    switch (prop.name) {
      case "SUMMARY":
        current.summary = prop.value || null;
        break;
      case "DESCRIPTION":
        current.description = prop.value || null;
        break;
      case "LOCATION":
        current.location = prop.value || null;
        break;
      case "DTSTART": {
        const isDate = prop.params.VALUE === "DATE";
        current.isAllDay = isDate;
        current.startAt = parseDateTimeValue(prop.value, isDate);
        break;
      }
      case "DTEND": {
        const isDate = prop.params.VALUE === "DATE";
        current.endAt = parseDateTimeValue(prop.value, isDate);
        break;
      }
      case "RRULE":
        current.recurrence = parseRRule(prop.value);
        break;
    }
  }

  return events;
}

function addDaysISO(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

/** Expands a (possibly recurring) parsed event into its individual
 * occurrences, each with the same time-of-day/duration as the original,
 * bounded by whichever of `windowEnd`, the rule's UNTIL, or its COUNT is
 * reached first. Non-recurring events return as a single-element array. */
export function expandWeeklyRecurrence(
  event: ParsedIcsCalendarEvent,
  windowEnd: string,
): ParsedIcsEvent[] {
  const base: ParsedIcsEvent = {
    title: event.title,
    description: event.description,
    location: event.location,
    startAt: event.startAt,
    endAt: event.endAt,
    isAllDay: event.isAllDay,
  };

  if (!event.recurrence) return [base];

  const { interval, byDay, until, count } = event.recurrence;
  const durationMs = event.endAt ? new Date(event.endAt).getTime() - new Date(event.startAt).getTime() : 0;
  const hardEnd = until && until < windowEnd ? until : windowEnd;
  const weekdays = byDay ?? [new Date(event.startAt).getUTCDay()];

  const occurrences: ParsedIcsEvent[] = [];
  const startWeekBegin = addDaysISO(event.startAt, -new Date(event.startAt).getUTCDay());

  let weekCursor = startWeekBegin;
  outer: while (weekCursor <= hardEnd) {
    for (const weekday of [...weekdays].sort((a, b) => a - b)) {
      const occurrenceDate = addDaysISO(weekCursor, weekday);
      if (occurrenceDate < event.startAt.slice(0, 10) + "T00:00:00.000Z") continue;
      if (occurrenceDate > hardEnd) break outer;

      const startAt = event.isAllDay
        ? occurrenceDate
        : `${occurrenceDate.slice(0, 10)}T${event.startAt.slice(11)}`;
      const endAt = event.endAt ? new Date(new Date(startAt).getTime() + durationMs).toISOString() : null;

      occurrences.push({ ...base, startAt, endAt });
      if (count != null && occurrences.length >= count) break outer;
    }
    weekCursor = addDaysISO(weekCursor, 7 * interval);
  }

  return occurrences;
}
