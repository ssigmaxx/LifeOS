import { CalendarRange, Plus, Sparkles, TrendingUp, TriangleAlert, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import {
  getBudgetStatus,
  getLifestyleVerdict,
  getMonthlyAllocation,
  listRecentPurchases,
} from "@/lib/services/budget-service";
import { CarbonLogDialog } from "../carbon/carbon-log-dialog";
import { BudgetCategoryRow } from "./budget-category-row";
import { RecentPurchases } from "./recent-purchases";
import { PlanMonthDialog } from "./plan-month-dialog";

const VERDICT_ICON = { good: TrendingUp, mixed: Sparkles, needs_attention: TriangleAlert } as const;

export default async function BudgetPage() {
  const [status, verdict, recentPurchases, allocation] = await Promise.all([
    getBudgetStatus(),
    getLifestyleVerdict(),
    listRecentPurchases(),
    getMonthlyAllocation(),
  ]);
  const VerdictIcon = VERDICT_ICON[verdict.tier];
  const hasAnyData = status.overall.monthSpent > 0 || status.categories.length > 0;

  const planMonthButton = (
    <PlanMonthDialog
      currentOverallAmount={allocation.overallAmount}
      currentCategoryAmounts={allocation.categoryAmounts}
      trigger={
        <Button size="sm" variant="outline">
          <CalendarRange className="size-4" /> Plan month
        </Button>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
          <p className="text-sm text-muted-foreground">
            Every expense also counts toward your carbon footprint — see it on Carbon.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {planMonthButton}
          <CarbonLogDialog
            defaultTab="shopping"
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Log expense
              </Button>
            }
          />
        </div>
      </div>

      {hasAnyData ? (
        <Card>
          <CardContent className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <VerdictIcon className="size-4 text-muted-foreground" />
            </div>
            <p className="text-sm">{verdict.summary}</p>
          </CardContent>
        </Card>
      ) : null}

      {!hasAnyData ? (
        <EmptyState
          icon={Wallet}
          title="No budget plan yet"
          description="Set what you have for the month and split it across categories, then log expenses as you go — both count toward your carbon footprint too."
          action={planMonthButton}
        />
      ) : (
        <>
          <Card>
            <CardContent className="divide-y py-0">
              <BudgetCategoryRow status={status.overall} />
            </CardContent>
          </Card>

          {status.categories.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">By category</h2>
              <Card>
                <CardContent className="divide-y py-0">
                  {status.categories.map((category) => (
                    <BudgetCategoryRow key={category.category} status={category} />
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <RecentPurchases purchases={recentPurchases} />
        </>
      )}
    </div>
  );
}
