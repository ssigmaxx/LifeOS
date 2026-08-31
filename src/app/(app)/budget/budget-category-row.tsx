import Link from "next/link";
import { Settings2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { CategorySpending } from "@/lib/services/budget-service";
import { SetBudgetDialog } from "./set-budget-dialog";

export function BudgetCategoryRow({ status }: { status: CategorySpending }) {
  const pct = status.budgetAmount ? Math.min(Math.round((status.spentAmount / status.budgetAmount) * 100), 100) : 0;
  const isOver = status.overBy != null;

  return (
    <div className="space-y-1.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{status.label}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatCurrency(status.spentAmount)}
            {status.budgetAmount != null ? ` / ${formatCurrency(status.budgetAmount)}` : ""}
          </span>
          <SetBudgetDialog
            category={status.category}
            label={status.label}
            currentAmount={status.budgetAmount}
            trigger={
              <Button size="icon-sm" variant="ghost" aria-label={`Set ${status.label} budget`}>
                <Settings2 className="size-3.5" />
              </Button>
            }
          />
        </div>
      </div>

      {status.budgetAmount != null ? (
        <Progress
          value={pct}
          className={cn(isOver && "[&_[data-slot=progress-indicator]]:bg-destructive")}
        />
      ) : null}

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {isOver ? (
          <span className="flex items-center gap-1 text-destructive">
            <TriangleAlert className="size-3" /> {formatCurrency(status.overBy!)} over budget
          </span>
        ) : (
          <span />
        )}
        <Link href="/carbon" className="hover:underline">
          {status.co2eKg.toFixed(1)} kg CO₂e
        </Link>
      </div>
    </div>
  );
}
