"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { PURCHASE_CATEGORY_LABELS, type PurchaseCategoryOption } from "@/lib/carbon/categories";
import { saveMonthlyAllocationAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };
const CATEGORIES = Object.keys(PURCHASE_CATEGORY_LABELS) as PurchaseCategoryOption[];

export function PlanMonthDialog({
  trigger,
  currentOverallAmount,
  currentCategoryAmounts,
}: {
  trigger: ReactNode;
  currentOverallAmount: number | null;
  currentCategoryAmounts: Partial<Record<PurchaseCategoryOption, number>>;
}) {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(currentOverallAmount ?? 0);
  const [amounts, setAmounts] = useState<Record<PurchaseCategoryOption, number>>(() => {
    const initial = {} as Record<PurchaseCategoryOption, number>;
    for (const c of CATEGORIES) initial[c] = currentCategoryAmounts[c] ?? 0;
    return initial;
  });

  const allocated = useMemo(() => CATEGORIES.reduce((sum, c) => sum + (amounts[c] || 0), 0), [amounts]);
  const remaining = total - allocated;

  const [state, formAction, isPending] = useActionState(async (_prev: FormActionState, formData: FormData) => {
    const result = await saveMonthlyAllocationAction(Object.fromEntries(formData));
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Plan this month</DialogTitle>
          <DialogDescription>Set what you have to spend, then split it across categories.</DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            formData.set("overallAmount", String(total));
            formData.set("categoryAmountsJson", JSON.stringify(amounts));
            formAction(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="overallAmount">Money for the month (EUR)</Label>
            <Input
              id="overallAmount"
              type="number"
              step="any"
              min={0}
              value={total || ""}
              onChange={(e) => setTotal(Number(e.target.value) || 0)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Split across categories</p>
            <div className="space-y-2">
              {CATEGORIES.map((c) => (
                <div key={c} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`amount-${c}`} className="flex-1 text-sm font-normal">
                    {PURCHASE_CATEGORY_LABELS[c]}
                  </Label>
                  <Input
                    id={`amount-${c}`}
                    type="number"
                    step="any"
                    min={0}
                    className="w-28"
                    value={amounts[c] || ""}
                    onChange={(e) =>
                      setAmounts((prev) => ({ ...prev, [c]: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm",
              remaining < 0 && "bg-destructive/10 text-destructive",
            )}
          >
            <span>{remaining < 0 ? "Over-allocated by" : "Left to assign"}</span>
            <span className="tabular-nums font-medium">{formatCurrency(Math.abs(remaining))}</span>
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
