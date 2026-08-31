"use server";

import { revalidatePath } from "next/cache";
import { getDayDetail, type DayDetail } from "@/lib/services/analytics-service";
import {
  createCalendar,
  createEvent,
  deleteEvent,
  ensureDefaultCalendar,
  importIcsEvents,
} from "@/lib/services/calendar-service";
import { calendarInputSchema, eventInputSchema } from "@/lib/validations/calendar";

export type FormActionState = { error: string | null };

export async function getDayDetailAction(date: string): Promise<DayDetail> {
  return getDayDetail(date);
}

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

export async function deleteEventAction(id: string) {
  await deleteEvent(id);
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
