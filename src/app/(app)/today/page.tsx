import Link from "next/link";
import { Droplets, Moon, Timer, Wind, BookOpen, Images, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getTodaySummary } from "@/lib/services/today-service";
import { TodayHabitRow } from "./today-habit-row";
import { PlaceholderSection } from "./placeholder-section";

function greeting(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const summary = await getTodaySummary();
  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const scorePct = summary.score != null ? Math.round(summary.score * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(today.getHours())}
        </h1>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between">
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
          <div className="w-28 shrink-0">
            <Progress value={scorePct ?? 0} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Habits</h2>
        {summary.dueHabits.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <ListChecks className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Nothing scheduled today</p>
                <p className="text-sm text-muted-foreground">
                  Create a habit or check its schedule.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/habits" />}
              >
                Go to Habits
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y py-0">
              {summary.dueHabits.map((habit) => (
                <TodayHabitRow key={habit.id} habit={habit} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Coming soon</h2>
        <div className="space-y-2">
          <PlaceholderSection icon={Droplets} title="Water" hint="Not tracked yet." />
          <PlaceholderSection icon={Moon} title="Sleep" hint="Not tracked yet." />
          <PlaceholderSection icon={Timer} title="Fasting" hint="Not tracked yet." />
          <PlaceholderSection icon={Wind} title="Meditation" hint="Not tracked yet." />
          <PlaceholderSection icon={BookOpen} title="Journal" hint="Not tracked yet." />
          <PlaceholderSection icon={Images} title="Photos" hint="Not tracked yet." />
        </div>
      </div>
    </div>
  );
}
