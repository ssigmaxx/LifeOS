import Link from "next/link";
import { Activity, Flame, Footprints, HeartPulse, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { RingCluster, RingLegend } from "@/components/ring-cluster";
import { formatMinutes } from "@/lib/format";
import { isFitbitConnected } from "@/lib/services/fitbit-service";
import { getRecentHealthMetrics } from "@/lib/services/health-service";
import { SyncNowButton } from "./sync-now-button";
import { WeeklyTrendChart } from "./weekly-trend-chart";

const TABLE_DAYS = 14;
const TREND_DAYS = 30;
const STEPS_TARGET = 10000;
const SLEEP_TARGET_MINUTES = 480; // 8h

const RING_COLORS = ["var(--health-steps)", "var(--health-sleep)"];

export default async function HealthPage() {
  const connected = await isFitbitConnected().catch(() => false);
  if (!connected) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
          <p className="text-sm text-muted-foreground">Steps, heart rate, and sleep from your watch.</p>
        </div>
        <EmptyState
          icon={Activity}
          title="No watch connected yet"
          description="Connect a Fitbit or Pixel Watch account in Settings to bring your steps, heart rate, and sleep data in here."
          action={
            <Button size="sm" render={<Link href="/settings" />}>
              Go to Settings
            </Button>
          }
        />
      </div>
    );
  }

  const metrics = await getRecentHealthMetrics(TREND_DAYS).catch(() => []);
  // Google's daily rollup only ever covers completed civil days — "today"
  // has no data until it's over, so this picks the most recent day that
  // actually has each metric rather than mislabeling yesterday's number
  // as today's.
  const latestSteps = metrics.find((m) => m.steps != null);
  const latestHeartRate = metrics.find((m) => m.restingHeartRate != null);
  const latestSleep = metrics.find((m) => m.sleepMinutes != null);
  const tableRows = metrics.slice(0, TABLE_DAYS);
  // WeeklyTrendChart wants oldest-first for a left-to-right timeline.
  const trendPoints = [...metrics].reverse().map((m) => ({ date: m.date, steps: m.steps }));

  const stepsPct = latestSteps?.steps != null ? Math.min(latestSteps.steps / STEPS_TARGET, 1) : 0;
  const sleepPct = latestSleep?.sleepMinutes != null ? Math.min(latestSleep.sleepMinutes / SLEEP_TARGET_MINUTES, 1) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
          <p className="text-sm text-muted-foreground">
            Synced from your connected watch every few hours. Latest day is shown first.
          </p>
        </div>
        <SyncNowButton />
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-center">
            <RingCluster
              size={128}
              strokeWidth={11}
              colors={RING_COLORS}
              rings={[
                { label: "Steps", value: stepsPct, valueLabel: latestSteps ? latestSteps.steps!.toLocaleString() : "—" },
                {
                  label: "Sleep",
                  value: sleepPct,
                  valueLabel: latestSleep ? formatMinutes(latestSleep.sleepMinutes!) : "—",
                },
              ]}
              centerValue={
                <span className="flex items-center gap-1 text-[color:var(--health-steps)]">
                  <Flame className="size-4" />
                  {Math.round(stepsPct * 100)}%
                </span>
              }
              centerLabel={`of ${STEPS_TARGET.toLocaleString()} steps`}
            />
            <RingLegend
              colors={RING_COLORS}
              rings={[
                {
                  label: "Steps",
                  value: stepsPct,
                  valueLabel: `${latestSteps ? latestSteps.steps!.toLocaleString() : "—"} / ${STEPS_TARGET.toLocaleString()}`,
                },
                {
                  label: "Sleep",
                  value: sleepPct,
                  valueLabel: `${latestSleep ? formatMinutes(latestSleep.sleepMinutes!) : "—"} / ${formatMinutes(SLEEP_TARGET_MINUTES)}`,
                },
              ]}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="border-[color-mix(in_oklab,var(--health-steps)_35%,var(--border))]">
            <CardContent className="flex items-center gap-3 py-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--health-steps)_15%,var(--card))] text-[color:var(--health-steps)]">
                <Footprints className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Steps</p>
                <p className="truncate text-xl font-bold tracking-tight tabular-nums">
                  {latestSteps ? latestSteps.steps!.toLocaleString() : "—"}
                </p>
                {latestSteps ? <p className="text-xs text-muted-foreground">{latestSteps.date}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[color-mix(in_oklab,var(--health-heart)_35%,var(--border))]">
            <CardContent className="flex items-center gap-3 py-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--health-heart)_15%,var(--card))] text-[color:var(--health-heart)]">
                <HeartPulse className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Resting heart rate</p>
                <p className="truncate text-xl font-bold tracking-tight tabular-nums">
                  {latestHeartRate ? `${latestHeartRate.restingHeartRate} bpm` : "—"}
                </p>
                {latestHeartRate ? <p className="text-xs text-muted-foreground">{latestHeartRate.date}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[color-mix(in_oklab,var(--health-sleep)_35%,var(--border))] sm:col-span-2">
            <CardContent className="flex items-center gap-3 py-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--health-sleep)_15%,var(--card))] text-[color:var(--health-sleep)]">
                <Moon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Sleep</p>
                <p className="truncate text-xl font-bold tracking-tight tabular-nums">
                  {latestSleep ? formatMinutes(latestSleep.sleepMinutes!) : "—"}
                </p>
                {latestSleep ? <p className="text-xs text-muted-foreground">{latestSleep.date}</p> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Steps trend</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyTrendChart points={trendPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last {TABLE_DAYS} days</CardTitle>
        </CardHeader>
        <CardContent>
          {tableRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Connected, but nothing has synced yet — the first sync runs within a few hours.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Steps</th>
                    <th className="py-2 pr-4 font-medium">Resting HR</th>
                    <th className="py-2 font-medium">Sleep</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.date} className="border-b last:border-0">
                      <td className="py-2 pr-4 tabular-nums">{row.date}</td>
                      <td className="py-2 pr-4 tabular-nums">{row.steps != null ? row.steps.toLocaleString() : "—"}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {row.restingHeartRate != null ? `${row.restingHeartRate} bpm` : "—"}
                      </td>
                      <td className="py-2 tabular-nums">
                        {row.sleepMinutes != null ? formatMinutes(row.sleepMinutes) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
