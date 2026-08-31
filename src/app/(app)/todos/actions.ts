"use server";

import { revalidatePath } from "next/cache";
import { todoInputSchema } from "@/lib/validations/todo";
import { createTodo, deleteTodo, toggleTodoComplete } from "@/lib/services/todo-service";

export type FormActionState = { error: string | null };

export async function createTodoAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = todoInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid todo." };
  }
  try {
    await createTodo(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create todo." };
  }
  revalidatePath("/todos");
  revalidatePath("/today");
  revalidatePath("/calendar");
  return { error: null };
}

export async function toggleTodoAction(id: string, completed: boolean) {
  await toggleTodoComplete(id, completed);
  revalidatePath("/todos");
  revalidatePath("/today");
  revalidatePath("/calendar");
}

export async function deleteTodoAction(id: string) {
  await deleteTodo(id);
  revalidatePath("/todos");
  revalidatePath("/today");
  revalidatePath("/calendar");
}
