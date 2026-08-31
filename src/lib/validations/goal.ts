import { z } from "zod";
import { optionalText } from "./shared";

export const goalFormSchema = z.object({
  name: z.string().min(1, "Name is required.").max(100),
  description: optionalText(500),
  targetDate: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.string().optional(),
  ),
});

export type GoalFormSchemaValues = z.infer<typeof goalFormSchema>;

export const milestoneFormSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
});

export type MilestoneFormSchemaValues = z.infer<typeof milestoneFormSchema>;
