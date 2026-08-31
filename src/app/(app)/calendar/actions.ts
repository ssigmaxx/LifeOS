"use server";

import { revalidatePath } from "next/cache";
import {
  countEventsInSeries,
  createCalendar,
  createEvent,
  deleteCalendar,
  deleteEvent,
  deleteEventSeries,
  ensureDefaultCalendar,
  importIcsEvents,
  mergeCalendars,
  updateEventTimes,
} from "@/lib/services/calendar-service";
import { calendarInputSchema, eventInputSchema, mergeCalendarsInputSchema } from "@/lib/validations/calendar";

export type FormActionState = { error: string | null };

export async function createEventAction(input: unknown): Promise<FormActionState> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event." };
  }
  try {
    await createEvent(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create event." };
  }
  revalidatePath("/calendar");
  return { error: null };
}

export async function updateEventTimesAction(id: string, startAt: string, endAt: string | null) {
  await updateEventTimes(id, startAt, endAt);
  revalidatePath("/calendar");
}

export async function deleteEventAction(id: string) {
  await deleteEvent(id);
  revalidatePath("/calendar");
}

export async function countEventsInSeriesAction(recurrenceGroupId: string): Promise<number> {
  return countEventsInSeries(recurrenceGroupId);
}

export async function deleteEventSeriesAction(recurrenceGroupId: string) {
  await deleteEventSeries(recurrenceGroupId);
  revalidatePath("/calendar");
}

export async function createCalendarAction(input: unknown): Promise<FormActionState> {
  const parsed = calendarInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid calendar." };
  }
  try {
    await createCalendar(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create calendar." };
  }
  revalidatePath("/calendar");
  return { error: null };
}

export async function mergeCalendarsAction(input: unknown): Promise<FormActionState> {
  const parsed = mergeCalendarsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid selection." };
  }
  try {
    await mergeCalendars(parsed.data.sourceId, parsed.data.targetId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to merge calendars." };
  }
  revalidatePath("/calendar");
  return { error: null };
}

export async function deleteCalendarAction(id: string) {
  await deleteCalendar(id);
  revalidatePath("/calendar");
}

export type ImportIcsState = { error: string | null; importedCount: number | null };

export async function importIcsAction(
  _prevState: ImportIcsState,
  formData: FormData,
): Promise<ImportIcsState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a .ics file to import.", importedCount: null };
  }

  let calendarId = formData.get("calendarId") as string | null;
  const newCalendarName = (formData.get("newCalendarName") as string | null)?.trim();
  const newCalendarColor = formData.get("newCalendarColor") as string | null;

  try {
    if (!calendarId || calendarId === "__new__") {
      if (newCalendarName && newCalendarColor) {
        const parsedCalendar = calendarInputSchema.safeParse({ name: newCalendarName, color: newCalendarColor });
        if (!parsedCalendar.success) {
          return { error: parsedCalendar.error.issues[0]?.message ?? "Invalid calendar.", importedCount: null };
        }
        const calendar = await createCalendar(parsedCalendar.data);
        calendarId = calendar.id;
      } else {
        calendarId = await ensureDefaultCalendar();
      }
    }

    const text = await file.text();
    const { count } = await importIcsEvents(calendarId, text);
    revalidatePath("/calendar");
    return { error: null, importedCount: count };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to import file.", importedCount: null };
  }
}
