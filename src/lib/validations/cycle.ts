import { z } from "zod";
import { moodSchema, optionalText } from "./shared";

const painLevelSchema = z.preprocess(
  (val) => (val === "" || val == null ? undefined : val),
  z.coerce.number().int().min(0).max(5).optional(),
);

export const cycleLogFormSchema = z.object({
  periodFlow: z.preprocess(
    (val) => (val === "" || val == null || val === "none" ? undefined : val),
    z.enum(["spotting", "light", "medium", "heavy"]).optional(),
  ),
  pillTaken: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
  mood: moodSchema,
  painLevel: painLevelSchema,
  symptoms: z.array(z.string().max(40)).max(20).default([]),
  note: optionalText(500),
});

export type CycleLogFormValues = z.infer<typeof cycleLogFormSchema>;
