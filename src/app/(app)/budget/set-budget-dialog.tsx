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
import { saveBudgetAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

export function SetBudgetDialog({
  trigger,
  category,
  label,
  currentWeeklyAmount,
  currentMonthlyAmount,
}: {
  trigger: ReactNode;
  category: BudgetCategory;
  label: string;
  currentWeeklyAmount: number | null;
  currentMonthlyAmount: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(async (_prev: FormActionState, formData: FormData) => {
    const result = await saveBudgetAction(Object.fromEntries(formData));
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{label} budget</DialogTitle>
          <DialogDescription>
            A weekly plan for what you mean to spend, and a monthly max you don&apos;t want to cross. Leave either
            blank to skip it.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            formData.set("category", category);
            formAction(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="weeklyAmount">Planned weekly (EUR)</Label>
            <Input
              id="weeklyAmount"
              name="weeklyAmount"
              type="number"
              step="any"
              min={0}
              defaultValue={currentWeeklyAmount ?? ""}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlyAmount">Max monthly (EUR)</Label>
            <Input
              id="monthlyAmount"
              name="monthlyAmount"
              type="number"
              step="any"
              min={0}
              defaultValue={currentMonthlyAmount ?? ""}
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
