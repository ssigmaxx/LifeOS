import { ListTodo } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { listTodos } from "@/lib/services/todo-service";
import { AddTodoForm } from "./add-todo-form";
import { TodoItem } from "./todo-item";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function TodosPage() {
  const todos = await listTodos();
  const today = todayISO();

  const active = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  const overdue = active.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = active.filter((t) => t.dueDate === today);
  const upcoming = active.filter((t) => t.dueDate && t.dueDate > today);
  const noDate = active.filter((t) => !t.dueDate);

  const groups: { label: string; items: typeof todos }[] = [
    { label: "Overdue", items: overdue },
    { label: "Today", items: dueToday },
    { label: "Upcoming", items: upcoming },
    { label: "No date", items: noDate },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Todos</h1>
        <p className="text-sm text-muted-foreground">
          One-off tasks — completing them today counts toward your daily score.
        </p>
      </div>

      <Card>
        <CardContent>
          <AddTodoForm />
        </CardContent>
      </Card>

      {todos.length === 0 ? (
        <EmptyState icon={ListTodo} title="No todos yet" description="Add your first task above." />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">{group.label}</h2>
              <Card>
                <CardContent className="divide-y py-0">
                  {group.items.map((todo) => (
                    <TodoItem key={todo.id} todo={todo} />
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}

          {completed.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Completed</h2>
              <Card>
                <CardContent className="divide-y py-0">
                  {completed.map((todo) => (
                    <TodoItem key={todo.id} todo={todo} />
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
