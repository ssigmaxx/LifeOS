import Link from "next/link";
import { Settings2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { CategoryBudgetStatus } from "@/lib/services/budget-service";
import { SetWeeklyBudgetDialog } from "./set-budget-dialog";

function PeriodBar({
  label,
  spent,
  budget,
  overBy,
}: {
  label: string;
  spent: number;
  budget: number | null;
  overBy: number | null;
}) {
  if (budget == null) return null;
  const pct = Math.min(Math.round((spent / budget) * 100), 100);
  const isOver = overBy != null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {formatCurrency(spent)} / {formatCurrency(budget)}
        </span>
      </div>
      <Progress value={pct} className={cn(isOver && "[&_[data-slot=progress-indicator]]:bg-destructive")} />
    </div>
  );
}

export function BudgetCategoryRow({ status }: { status: CategoryBudgetStatus }) {
  const isOver = status.weekOverBy != null || status.monthOverBy != null;
  const hasAnyBudget = status.weekBudget != null || status.monthBudget != null;

  return (
    <div className="space-y-2 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{status.label}</span>
        <div className="flex items-center gap-1">
          {!hasAnyBudget ? (
            <span className="text-sm tabular-nums text-muted-foreground">{formatCurrency(status.monthSpent)}</span>
          ) : null}
          <SetWeeklyBudgetDialog
            category={status.category}
            label={status.label}
            currentAmount={status.weekBudget}
            trigger={
              <Button size="icon-sm" variant="ghost" aria-label={`Set ${status.label} weekly plan`}>
                <Settings2 className="size-3.5" />
              </Button>
            }
          />
        </div>
      </div>

      {hasAnyBudget ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <PeriodBar label="This week" spent={status.weekSpent} budget={status.weekBudget} overBy={status.weekOverBy} />
          <PeriodBar
            label="This month"
            spent={status.monthSpent}
            budget={status.monthBudget}
            overBy={status.monthOverBy}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {isOver ? (
          <span className="flex items-center gap-1 text-destructive">
            <TriangleAlert className="size-3" />
            over {status.weekOverBy != null ? "this week's plan" : "this month's max"}
          </span>
        ) : (
          <span />
        )}
        <Link href="/carbon" className="hover:underline">
          {status.co2eKg.toFixed(1)} kg CO₂e this month
        </Link>
      </div>
    </div>
  );
}
