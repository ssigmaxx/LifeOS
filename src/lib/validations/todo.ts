import { z } from "zod";
import { optionalText } from "./shared";

export const todoInputSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  description: optionalText(1000),
  dueDate: optionalText(200),
});

export type TodoInput = z.infer<typeof todoInputSchema>;
