"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTodoAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

export function AddTodoForm() {
  const [state, formAction, isPending] = useActionState(createTodoAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2 sm:flex-row">
      <Input name="title" placeholder="Add a todo…" required maxLength={200} className="flex-1" />
      <Input name="dueDate" type="date" className="sm:w-40" />
      <Button type="submit" size="sm" disabled={isPending}>
        <Plus className="size-4" /> Add
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive sm:basis-full">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
