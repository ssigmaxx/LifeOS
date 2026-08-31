import { Plus, Sparkles, TrendingUp, TriangleAlert, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { getBudgetStatus, getLifestyleVerdict, listRecentPurchases } from "@/lib/services/budget-service";
import { CarbonLogDialog } from "../carbon/carbon-log-dialog";
import { BudgetCategoryRow } from "./budget-category-row";
import { RecentPurchases } from "./recent-purchases";

const VERDICT_ICON = { good: TrendingUp, mixed: Sparkles, needs_attention: TriangleAlert } as const;

export default async function BudgetPage() {
  const [status, verdict, recentPurchases] = await Promise.all([
    getBudgetStatus(),
    getLifestyleVerdict(),
    listRecentPurchases(),
  ]);
  const VerdictIcon = VERDICT_ICON[verdict.tier];
  const hasAnyData = status.overall.monthSpent > 0 || status.categories.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
          <p className="text-sm text-muted-foreground">
            Every expense also counts toward your carbon footprint — see it on Carbon.
          </p>
        </div>
        <CarbonLogDialog
          defaultTab="shopping"
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Log expense
            </Button>
          }
        />
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
          title="No expenses logged yet"
          description="Log your first expense above — it counts toward both your budget and your carbon footprint."
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
