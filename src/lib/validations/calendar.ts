import { z } from "zod";
import { CALENDAR_COLOR_PALETTE } from "@/lib/calendar-constants";

export const calendarInputSchema = z.object({
  name: z.string().min(1, "Name is required.").max(100),
  color: z.enum(CALENDAR_COLOR_PALETTE),
});

export type CalendarInput = z.infer<typeof calendarInputSchema>;

// datetime-local inputs come as "YYYY-MM-DDTHH:MM" with no timezone —
// treated as a literal UTC-equivalent instant, same documented
// simplification as src/lib/ics.ts's non-VTIMEZONE handling.
const localDateTimeSchema = z
  .string()
  .min(1)
  .transform((v) => (v.length === 16 ? `${v}:00.000Z` : v));

export const eventInputSchema = z
  .object({
    calendarId: z.string().min(1, "Choose a calendar."),
    title: z.string().min(1, "Title is required.").max(200),
    description: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(1000).optional()),
    location: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(200).optional()),
    isAllDay: z.preprocess((v) => v === "true", z.boolean()).default(false),
    startAt: z.string().min(1, "Start is required."),
    endAt: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  })
  .transform((data) => ({
    ...data,
    startAt: data.isAllDay ? `${data.startAt}T00:00:00.000Z` : localDateTimeSchema.parse(data.startAt),
    endAt: data.endAt
      ? data.isAllDay
        ? `${data.endAt}T00:00:00.000Z`
        : localDateTimeSchema.parse(data.endAt)
      : null,
  }));

export type EventInput = z.infer<typeof eventInputSchema>;
