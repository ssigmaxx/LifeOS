import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getTodaySummary } from "@/lib/services/today-service";
import { listHabits } from "@/lib/services/habit-service";
import { listGoals } from "@/lib/services/goal-service";
import { getDailyScoreSeries, resolveRange } from "@/lib/services/analytics-service";
import { getDailyTotals, getNutritionProfile } from "@/lib/services/nutrition-service";
import { ScoreTrendChart } from "./analytics/score-trend-chart";
import { NutritionCard } from "./today/nutrition-card";

export default async function DashboardPage() {
  const [summary, habits, goals, trend, nutritionProfile, nutritionTotals] = await Promise.all([
    getTodaySummary(),
    listHabits(),
    listGoals(),
    getDailyScoreSeries(resolveRange("7d")),
    getNutritionProfile(),
    getDailyTotals(),
  ]);

  const scorePct = summary.score != null ? Math.round(summary.score * 100) : null;
  const activeStreaks = habits
    .filter((h) => h.isActive && h.streak.currentStreak > 0)
    .sort((a, b) => b.streak.currentStreak - a.streak.currentStreak)
    .slice(0, 5);
  const activeGoals = goals.filter((g) => g.status === "active").slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your at-a-glance overview of habits, streaks, and recent trends.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Today&apos;s score</p>
            <p className="text-3xl font-semibold tracking-tight">
              {scorePct != null ? `${scorePct}%` : "—"}
            </p>
            {summary.totalCount > 0 ? (
              <p className="text-sm text-muted-foreground">
                {summary.completedCount} of {summary.totalCount} habits done
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="w-28">
              <Progress value={scorePct ?? 0} />
            </div>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/today" />}>
              Go to Today <ArrowRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">7-day trend</h2>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:underline">
            View analytics
          </Link>
        </div>
        <Card>
          <CardContent>
            <ScoreTrendChart series={trend} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Active streaks</h2>
          <Link href="/habits" className="text-xs text-muted-foreground hover:underline">
            View habits
          </Link>
        </div>
        {activeStreaks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No active streaks yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y py-0">
              {activeStreaks.map((h) => (
                <div key={h.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-base">
                    {h.icon || "•"}
                  </div>
                  <p className="flex-1 truncate text-sm font-medium">{h.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Flame className="size-4" />
                    {h.streak.currentStreak}d
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Goals</h2>
          <Link href="/goals" className="text-xs text-muted-foreground hover:underline">
            View goals
          </Link>
        </div>
        {activeGoals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No active goals yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-3 py-4">
              {activeGoals.map((g) => {
                const pct = Math.round(Math.min(g.progressRatio, 1) * 100);
                return (
                  <div key={g.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <NutritionCard profile={nutritionProfile} totals={nutritionTotals} />
    </div>
  );
}
