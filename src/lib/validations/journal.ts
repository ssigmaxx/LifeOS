import { z } from "zod";
import { moodSchema, optionalText } from "./shared";

export const morningEntrySchema = z.object({
  mood: moodSchema,
  text: optionalText(5000),
  intention: optionalText(500),
  goals: optionalText(500),
});

export const eveningEntrySchema = z.object({
  mood: moodSchema,
  text: optionalText(5000),
  wentWell: optionalText(1000),
  couldImprove: optionalText(1000),
  gratitude: optionalText(1000),
});

export type MorningEntryValues = z.infer<typeof morningEntrySchema>;
export type EveningEntryValues = z.infer<typeof eveningEntrySchema>;
