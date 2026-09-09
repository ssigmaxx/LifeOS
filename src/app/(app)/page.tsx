import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadialProgress } from "@/components/radial-progress";
import { summarizeToday } from "@/lib/services/today-service";
import { getTodayLogs, listHabits } from "@/lib/services/habit-service";
import { listGoals } from "@/lib/services/goal-service";
import { getDailyScoreSeries, resolveRange } from "@/lib/services/analytics-service";
import { getDailyTotals, getNutritionProfile } from "@/lib/services/nutrition-service";
import { getTodosDueOnDate } from "@/lib/services/todo-service";
import { OnboardingChecklist, type OnboardingStep } from "@/components/onboarding-checklist";
import { OnboardingTour } from "@/components/onboarding-tour";
import { ScoreTrendChart } from "./analytics/score-trend-chart";
import { NutritionCard } from "./today/nutrition-card";

const UNCATEGORIZED_ANCHOR = "uncategorized";

export default async function DashboardPage() {
  // listHabits() is fetched once and reused for both the streak list below
  // and today's summary (via summarizeToday) — today-service's own
  // getTodaySummary() would call listHabits() a second time internally.
  const [habits, todayLogs, todosToday, goals, trend, nutritionProfile, nutritionTotals] = await Promise.all([
    listHabits(),
    getTodayLogs(),
    getTodosDueOnDate(),
    listGoals(),
    getDailyScoreSeries(resolveRange("7d")),
    getNutritionProfile(),
    getDailyTotals(),
  ]);
  const summary = summarizeToday(habits, todayLogs, todosToday);

  const scorePct = summary.score != null ? Math.round(summary.score * 100) : null;
  const activeStreaks = habits
    .filter((h) => h.isActive && h.streak.currentStreak > 0)
    .sort((a, b) => b.streak.currentStreak - a.streak.currentStreak)
    .slice(0, 5);
  const activeGoals = goals.filter((g) => g.status === "active").slice(0, 3);

  const onboardingSteps: OnboardingStep[] = [
    { id: "habit", label: "Add your first habit", href: "/habits", done: habits.length > 0 },
    { id: "goal", label: "Set a goal", href: "/goals", done: goals.length > 0 },
    { id: "log", label: "Log something today", href: "/today", done: summary.completedCount > 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your at-a-glance overview of habits, streaks, and recent trends.
        </p>
      </div>

      <OnboardingTour />
      <OnboardingChecklist steps={onboardingSteps} />

      <Link href="/today" className="block">
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <RadialProgress value={scorePct ?? 0}>
                <span className="text-lg font-semibold tracking-tight">
                  {scorePct != null ? `${scorePct}%` : "—"}
                </span>
              </RadialProgress>
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s score</p>
                {summary.totalCount > 0 ? (
                  <p className="text-sm font-medium">
                    {summary.completedCount} of {summary.totalCount} habits done
                  </p>
                ) : null}
              </div>
            </div>
            <span aria-hidden="true" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Go to Today <ArrowRight className="size-4" />
            </span>
          </CardContent>
        </Card>
      </Link>

      <div className="grid gap-6 md:grid-cols-5">
        <div className="space-y-2 md:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">7-day trend</h2>
            <Link href="/analytics" className="text-xs text-muted-foreground hover:underline">
              View analytics
            </Link>
          </div>
          <Card className="h-full">
            <CardContent>
              <ScoreTrendChart series={trend} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2 md:col-span-2">
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
                  <Link
                    key={h.id}
                    href={`/habits#category-${h.categoryId ?? UNCATEGORIZED_ANCHOR}`}
                    className="-mx-(--card-spacing) flex items-center gap-3 px-(--card-spacing) py-2.5 transition-colors hover:bg-accent"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-base">
                      {h.icon || "•"}
                    </div>
                    <p className="flex-1 truncate text-sm font-medium">{h.name}</p>
                    <p className="flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                      <Flame className="size-4" />
                      {h.streak.currentStreak}d
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
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
            <CardContent className="divide-y py-0">
              {activeGoals.map((g) => {
                const pct = Math.round(Math.min(g.progressRatio, 1) * 100);
                return (
                  <Link
                    key={g.id}
                    href="/goals"
                    className="-mx-(--card-spacing) block space-y-1.5 px-(--card-spacing) py-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </Link>
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
