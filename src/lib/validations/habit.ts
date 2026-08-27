import { z } from "zod";
import { optionalText } from "./shared";

export const trackingTypeSchema = z.enum([
  "boolean",
  "numeric",
  "duration",
  "counter",
  "time",
]);

export const frequencySchema = z.enum(["daily", "custom"]);

export const habitFormSchema = z
  .object({
    name: z.string().min(1, "Name is required.").max(100),
    description: optionalText(500),
    categoryId: optionalText(200),
    icon: optionalText(50),
    trackingType: trackingTypeSchema,
    unit: optionalText(20),
    targetValue: z.preprocess(
      (val) => (val === "" || val == null ? undefined : val),
      z.coerce.number().positive().optional(),
    ),
    scoreWeight: z.coerce.number().min(0).default(1),
    startDate: z.string().min(1, "Start date is required."),
    frequency: frequencySchema,
    weekdays: z.array(z.coerce.number().int().min(0).max(6)).optional().default([]),
    sharedWithFriends: z.preprocess((val) => val === "true", z.boolean()).default(false),
  })
  .refine(
    (data) => data.frequency !== "custom" || data.weekdays.length > 0,
    { message: "Select at least one day.", path: ["weekdays"] },
  );

export type HabitFormValues = z.infer<typeof habitFormSchema>;

export const newCategorySchema = z.object({
  name: z.string().min(1, "Name is required.").max(50),
});
