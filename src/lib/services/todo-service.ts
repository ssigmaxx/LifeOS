import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TodoInput } from "@/lib/validations/todo";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export type Todo = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
};

function mapRow(row: {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
}): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    completed: row.completed,
    completedAt: row.completed_at,
  };
}

export async function listTodos(): Promise<Todo[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("todos")
    .select("id, title, description, due_date, completed, completed_at")
    .eq("user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapRow);
}

export async function createTodo(input: TodoInput): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("todos").insert({
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    due_date: input.dueDate ?? null,
  });
  if (error) throw error;
}

export async function updateTodo(id: string, input: TodoInput): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("todos")
    .update({
      title: input.title,
      description: input.description ?? null,
      due_date: input.dueDate ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function toggleTodoComplete(id: string, completed: boolean): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("todos")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTodo(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw error;
}

export type TodoCompletion = { completed: boolean };

export async function getTodosDueOnDate(date: string = todayISO()): Promise<TodoCompletion[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("todos")
    .select("completed")
    .eq("user_id", userId)
    .eq("due_date", date);
  if (error) throw error;
  return data;
}

// Used by the Calendar day-detail view, which needs id/title too, not just
// the completion flag getTodosDueOnDate returns for scoring purposes.
export async function listTodosDueOnDateWithId(
  date: string = todayISO(),
): Promise<{ id: string; title: string; completed: boolean }[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("todos")
    .select("id, title, completed")
    .eq("user_id", userId)
    .eq("due_date", date);
  if (error) throw error;
  return data;
}

// Used by the Calendar week view, which needs id/title per day, not just
// the completion flag getTodosDueInRange returns for scoring purposes.
export async function listTodosDueInRangeWithId(
  startDate: string,
  endDate: string,
): Promise<Map<string, { id: string; title: string; completed: boolean }[]>> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("todos")
    .select("id, title, due_date, completed")
    .eq("user_id", userId)
    .gte("due_date", startDate)
    .lte("due_date", endDate);
  if (error) throw error;

  const byDate = new Map<string, { id: string; title: string; completed: boolean }[]>();
  for (const row of data) {
    const list = byDate.get(row.due_date!) ?? [];
    list.push({ id: row.id, title: row.title, completed: row.completed });
    byDate.set(row.due_date!, list);
  }
  return byDate;
}

// Used by analytics-service.ts's date-range score series — one query
// instead of one per day.
export async function getTodosDueInRange(
  startDate: string,
  endDate: string,
): Promise<Map<string, TodoCompletion[]>> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("todos")
    .select("due_date, completed")
    .eq("user_id", userId)
    .gte("due_date", startDate)
    .lte("due_date", endDate);
  if (error) throw error;

  const byDate = new Map<string, TodoCompletion[]>();
  for (const row of data) {
    const list = byDate.get(row.due_date!) ?? [];
    list.push({ completed: row.completed });
    byDate.set(row.due_date!, list);
  }
  return byDate;
}
