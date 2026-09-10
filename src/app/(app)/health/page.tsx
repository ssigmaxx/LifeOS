import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Activity, Flame, Footprints, HeartPulse, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { RingCluster, RingLegend } from "@/components/ring-cluster";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/format";
import { isFitbitConnected } from "@/lib/services/fitbit-service";
import { getRecentHealthMetrics } from "@/lib/services/health-service";
import { SyncNowButton } from "./sync-now-button";
import { TrendChart } from "./trend-chart";

const DAYS = 30;
const STEPS_TARGET = 10000;
const SLEEP_TARGET_MINUTES = 480; // 8h

const RING_COLORS = ["var(--health-steps)", "var(--health-sleep)"];

// Bold, fully-colored pill — steps/heart-rate/sleep read at a glance by
// color the same way a fitness watch face groups its daily rings, rather
// than a small colored icon on an otherwise neutral card.
function HealthStatPill({
  icon: Icon,
  color,
  textClassName,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  color: string;
  textClassName: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-3 rounded-2xl px-4 py-3.5", textClassName)}
      style={{ background: color }}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/25">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs opacity-80">{label}</p>
        <p className="truncate text-xl font-bold tracking-tight tabular-nums">{value}</p>
      </div>
      {hint ? <p className="shrink-0 text-xs opacity-70 tabular-nums">{hint.slice(5)}</p> : null}
    </div>
  );
}

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

  const metrics = await getRecentHealthMetrics(DAYS).catch(() => []);
  // Google's daily rollup only ever covers completed civil days — "today"
  // has no data until it's over, so this picks the most recent day that
  // actually has each metric rather than mislabeling yesterday's number
  // as today's.
  const latestSteps = metrics.find((m) => m.steps != null);
  const latestHeartRate = metrics.find((m) => m.restingHeartRate != null);
  const latestSleep = metrics.find((m) => m.sleepMinutes != null);
  // Charts want oldest-first for a left-to-right timeline.
  const chronological = [...metrics].reverse();
  const stepsPoints = chronological.map((m) => ({ date: m.date, value: m.steps }));
  const sleepPoints = chronological.map((m) => ({ date: m.date, value: m.sleepMinutes }));
  const heartRatePoints = chronological.map((m) => ({ date: m.date, value: m.restingHeartRate }));

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

      <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-stretch">
        <Card className="border-none bg-[linear-gradient(160deg,color-mix(in_oklab,var(--health-steps)_10%,var(--card)),var(--card))]">
          <CardContent className="flex h-full flex-col items-center justify-center gap-2 py-8">
            <RingCluster
              size={168}
              strokeWidth={14}
              gap={5}
              colors={RING_COLORS}
              rings={[
                { label: "Steps", value: stepsPct, valueLabel: latestSteps ? latestSteps.steps!.toLocaleString() : "—" },
                {
                  label: "Sleep",
                  value: sleepPct,
                  valueLabel: latestSleep ? formatMinutes(latestSleep.sleepMinutes!) : "—",
                },
              ]}
              centerValue={<span className="text-3xl font-bold tracking-tight">{Math.round(stepsPct * 100)}%</span>}
              centerLabel={
                <span className="flex items-center gap-1">
                  <Flame className="size-3" />
                  {latestSteps ? latestSteps.steps!.toLocaleString() : "—"} of {STEPS_TARGET.toLocaleString()}
                </span>
              }
            />
            <RingLegend
              colors={RING_COLORS}
              rings={[
                {
                  label: "Steps",
                  value: stepsPct,
                  valueLabel: latestSteps ? latestSteps.steps!.toLocaleString() : "—",
                },
                {
                  label: "Sleep",
                  value: sleepPct,
                  valueLabel: latestSleep ? formatMinutes(latestSleep.sleepMinutes!) : "—",
                },
              ]}
              className="mt-2 w-full max-w-40"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-rows-3">
          <HealthStatPill
            icon={Footprints}
            color="var(--health-steps)"
            textClassName="text-white"
            label="Steps"
            value={latestSteps ? latestSteps.steps!.toLocaleString() : "—"}
            hint={latestSteps?.date}
          />
          <HealthStatPill
            icon={HeartPulse}
            color="var(--health-heart)"
            textClassName="text-amber-950"
            label="Resting heart rate"
            value={latestHeartRate ? `${latestHeartRate.restingHeartRate} bpm` : "—"}
            hint={latestHeartRate?.date}
          />
          <HealthStatPill
            icon={Moon}
            color="var(--health-sleep)"
            textClassName="text-white"
            label="Sleep"
            value={latestSleep ? formatMinutes(latestSleep.sleepMinutes!) : "—"}
            hint={latestSleep?.date}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart points={stepsPoints} metric="steps" color="var(--health-steps)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sleep</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart points={sleepPoints} metric="sleep" color="var(--health-sleep)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resting heart rate</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart points={heartRatePoints} metric="heartRate" color="var(--health-heart)" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last {DAYS} days</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.length === 0 ? (
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
                  {metrics.map((row) => (
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
