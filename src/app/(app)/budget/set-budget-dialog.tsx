"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BudgetCategory } from "@/lib/services/budget-service";
import { upsertBudgetAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

export function SetBudgetDialog({
  trigger,
  category,
  label,
  currentAmount,
}: {
  trigger: ReactNode;
  category: BudgetCategory;
  label: string;
  currentAmount: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormActionState, formData: FormData) => {
      const result = await upsertBudgetAction(Object.fromEntries(formData));
      if (!result.error) setOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{label} budget</DialogTitle>
          <DialogDescription>A monthly cap — you&apos;ll see when you go over it.</DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            formData.set("category", category);
            formAction(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="amount">Monthly amount (EUR)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="any"
              min={0}
              defaultValue={currentAmount ?? ""}
              autoFocus
              required
            />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
