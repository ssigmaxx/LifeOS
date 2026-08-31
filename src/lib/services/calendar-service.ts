import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CALENDAR_COLOR } from "@/lib/calendar-constants";
import { expandWeeklyRecurrence, parseIcsFile } from "@/lib/ics";
import type { CalendarInput, EventInput } from "@/lib/validations/calendar";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

export type Calendar = { id: string; name: string; color: string };

export async function listCalendars(): Promise<Calendar[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("calendars")
    .select("id, name, color")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return data;
}

// Lazily creates a default calendar the first time someone adds an event
// or imports a file with none yet — no forced "create a calendar" step.
export async function ensureDefaultCalendar(): Promise<string> {
  const { supabase, userId } = await requireUserId();
  const { data: existing, error: existingError } = await supabase
    .from("calendars")
    .select("id")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("calendars")
    .insert({ user_id: userId, name: "Personal", color: DEFAULT_CALENDAR_COLOR })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function createCalendar(input: CalendarInput): Promise<Calendar> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("calendars")
    .insert({ user_id: userId, name: input.name, color: input.color })
    .select("id, name, color")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCalendar(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("calendars").delete().eq("id", id);
  if (error) throw error;
}

export type CalendarEvent = {
  id: string;
  calendarId: string;
  calendarColor: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
};

function mapEventRow(row: {
  id: string;
  calendar_id: string;
  calendars: { color: string } | { color: string }[] | null;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  is_all_day: boolean;
}): CalendarEvent {
  const calendar = Array.isArray(row.calendars) ? row.calendars[0] : row.calendars;
  return {
    id: row.id,
    calendarId: row.calendar_id,
    calendarColor: calendar?.color ?? DEFAULT_CALENDAR_COLOR,
    title: row.title,
    description: row.description,
    location: row.location,
    startAt: row.start_at,
    endAt: row.end_at,
    isAllDay: row.is_all_day,
  };
}

export async function listEventsForRange(startISO: string, endISO: string): Promise<CalendarEvent[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, calendar_id, title, description, location, start_at, end_at, is_all_day, calendars(color)")
    .eq("user_id", userId)
    .gte("start_at", startISO)
    .lte("start_at", endISO)
    .order("start_at");
  if (error) throw error;
  return data.map(mapEventRow);
}

export async function listEventsForDate(dateISO: string): Promise<CalendarEvent[]> {
  return listEventsForRange(`${dateISO}T00:00:00.000Z`, `${dateISO}T23:59:59.999Z`);
}

export async function createEvent(input: EventInput): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("calendar_events").insert({
    user_id: userId,
    calendar_id: input.calendarId,
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    start_at: input.startAt,
    end_at: input.endAt,
    is_all_day: input.isAllDay,
  });
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}

// Weekly-recurring events are capped at generating occurrences up to 1
// year out (or the rule's own UNTIL/COUNT if sooner) — see ics.ts.
const RECURRENCE_WINDOW_DAYS = 365;

export async function importIcsEvents(calendarId: string, icsText: string): Promise<{ count: number }> {
  const { supabase, userId } = await requireUserId();
  const parsed = parseIcsFile(icsText);

  const windowEnd = new Date();
  windowEnd.setUTCDate(windowEnd.getUTCDate() + RECURRENCE_WINDOW_DAYS);
  const windowEndISO = windowEnd.toISOString();

  const rows: {
    user_id: string;
    calendar_id: string;
    title: string;
    description: string | null;
    location: string | null;
    start_at: string;
    end_at: string | null;
    is_all_day: boolean;
    recurrence_group_id: string | null;
  }[] = [];

  for (const event of parsed) {
    const occurrences = expandWeeklyRecurrence(event, windowEndISO);
    const groupId = occurrences.length > 1 ? crypto.randomUUID() : null;
    for (const occurrence of occurrences) {
      rows.push({
        user_id: userId,
        calendar_id: calendarId,
        title: occurrence.title,
        description: occurrence.description,
        location: occurrence.location,
        start_at: occurrence.startAt,
        end_at: occurrence.endAt,
        is_all_day: occurrence.isAllDay,
        recurrence_group_id: groupId,
      });
    }
  }

  if (rows.length === 0) return { count: 0 };

  const { error } = await supabase.from("calendar_events").insert(rows);
  if (error) throw error;
  return { count: rows.length };
}
