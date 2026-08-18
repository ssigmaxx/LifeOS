import { z } from "zod";
import { optionalText } from "./shared";

export const goalMetricTypeSchema = z.enum([
  "water_ml",
  "meditation_minutes",
  "gym_sessions",
  "sleep_hours",
  "fasting_hours",
]);

export const goalFrequencySchema = z.enum(["daily", "weekly", "average"]);

export const goalFormSchema = z
  .object({
    name: z.string().min(1, "Name is required.").max(100),
    description: optionalText(500),
    metricType: goalMetricTypeSchema,
    targetValue: z.preprocess(
      (val) => (val === "" || val == null ? undefined : val),
      z.coerce.number().positive("Target must be greater than 0."),
    ),
    frequency: goalFrequencySchema,
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.preprocess(
      (val) => (val === "" || val == null ? undefined : val),
      z.string().optional(),
    ),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

export type GoalFormSchemaValues = z.infer<typeof goalFormSchema>;
