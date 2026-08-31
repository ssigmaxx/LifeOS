"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/services/todo-service";
import { deleteTodoAction, toggleTodoAction } from "./actions";

function formatDueDate(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = dateISO < today;
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label, isOverdue };
}

export function TodoItem({ todo }: { todo: Todo }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const due = todo.dueDate ? formatDueDate(todo.dueDate) : null;

  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox
        checked={todo.completed}
        disabled={isPending}
        onCheckedChange={(checked) => startTransition(() => toggleTodoAction(todo.id, checked === true))}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", todo.completed && "text-muted-foreground line-through")}>
          {todo.title}
        </p>
        {due && !todo.completed ? (
          <p className={cn("text-xs text-muted-foreground", due.isOverdue && "text-destructive")}>
            {due.isOverdue ? "Overdue · " : "Due "}
            {due.label}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Delete ${todo.title}`}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{todo.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              onClick={() => {
                setDeleteOpen(false);
                startTransition(() => deleteTodoAction(todo.id));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
