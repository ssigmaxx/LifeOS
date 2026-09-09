import Link from "next/link";
import { CalendarHeart, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { FLOW_LABELS } from "@/lib/cycle-constants";
import {
  getCycleLog,
  isCycleTrackingEnabled,
  listCycleLogs,
  listPeriodDates,
  predictNextPeriod,
  type CycleLog,
} from "@/lib/services/cycle-service";
import { CycleCalendar } from "./cycle-calendar";
import { CycleLogForm } from "./cycle-log-form";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function hasAnyData(log: CycleLog) {
  return (
    log.periodFlow != null ||
    log.pillTaken != null ||
    log.mood != null ||
    log.painLevel != null ||
    log.symptoms.length > 0 ||
    (log.note?.length ?? 0) > 0
  );
}

export default async function CyclePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const enabled = await isCycleTrackingEnabled();

  if (!enabled) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cycle</h1>
          <p className="text-sm text-muted-foreground">Period, birth control, mood, and pain tracking.</p>
        </div>
        <EmptyState
          icon={HeartPulse}
          title="Cycle tracking is off"
          description="Turn it on in Settings to start logging."
          action={
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/settings" />}>
              Go to Settings
            </Button>
          }
        />
      </div>
    );
  }

  const { date: dateParam } = await searchParams;
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam <= todayISO() ? dateParam : todayISO();

  const [log, history, periodDates, prediction] = await Promise.all([
    getCycleLog(date),
    listCycleLogs({ start: isoDaysAgo(90) }),
    listPeriodDates({ start: isoDaysAgo(400), end: todayISO() }),
    predictNextPeriod(),
  ]);
  const loggedHistory = history.filter(hasAnyData);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cycle</h1>
        <p className="text-sm text-muted-foreground">Period, birth control, mood, and pain tracking.</p>
      </div>

      <Card className="border-pink-500/30 bg-pink-500/5">
        <CardContent className="flex items-center gap-3">
          <CalendarHeart className="size-5 shrink-0 text-pink-500 dark:text-pink-400" />
          {prediction.nextPeriodStart && prediction.averageCycleLengthDays != null ? (
            <div>
              <p className="text-sm font-medium text-pink-700 dark:text-pink-300">
                Next period estimated {formatDate(prediction.nextPeriodStart)}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on your last {prediction.cyclesUsed} logged cycle{prediction.cyclesUsed === 1 ? "" : "s"}{" "}
                (avg {prediction.averageCycleLengthDays} days) — an estimate from your own history, not medical
                advice.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Log two full periods to see a next-period estimate here — it&apos;s calculated from the gap between
              your own past cycles.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-2">
          <CycleCalendar selectedDate={date} periodDates={periodDates} />
        </div>
        <div className="md:col-span-3">
          <CycleLogForm key={date} date={date} log={log} />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Last 90 days</h2>
        {loggedHistory.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No entries yet — log today above to get started.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y py-0">
              {loggedHistory.map((entry) => (
                <Link
                  key={entry.logDate}
                  href={`/cycle?date=${entry.logDate}`}
                  className="-mx-(--card-spacing) flex flex-wrap items-center gap-x-4 gap-y-1 px-(--card-spacing) py-2.5 text-sm transition-colors hover:bg-accent"
                >
                  <span className="w-24 shrink-0 font-medium">{formatDate(entry.logDate)}</span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                    {entry.periodFlow ? <span>{FLOW_LABELS[entry.periodFlow]}</span> : null}
                    {entry.pillTaken != null ? <span>Pill {entry.pillTaken ? "✓" : "skipped"}</span> : null}
                    {entry.mood != null ? <span>Mood {entry.mood}/5</span> : null}
                    {entry.painLevel != null ? <span>Pain {entry.painLevel}/5</span> : null}
                    {entry.symptoms.length > 0 ? <span>{entry.symptoms.join(", ")}</span> : null}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
