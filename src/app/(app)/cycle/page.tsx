import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { FLOW_LABELS } from "@/lib/cycle-constants";
import { getCycleLog, isCycleTrackingEnabled, listCycleLogs, type CycleLog } from "@/lib/services/cycle-service";
import { CycleLogForm } from "./cycle-log-form";
import { DateNav } from "./date-nav";

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

  const [log, history] = await Promise.all([
    getCycleLog(date),
    listCycleLogs({ start: isoDaysAgo(90) }),
  ]);
  const loggedHistory = history.filter(hasAnyData);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cycle</h1>
          <p className="text-sm text-muted-foreground">Period, birth control, mood, and pain tracking.</p>
        </div>
        <DateNav date={date} />
      </div>

      <CycleLogForm key={date} date={date} log={log} />

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
