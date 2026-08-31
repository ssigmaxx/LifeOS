import { z } from "zod";

export const todoInputSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  description: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(1000).optional()),
  dueDate: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
});

export type TodoInput = z.infer<typeof todoInputSchema>;
