import Link from "next/link";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { StatTileRow, type StatTileData } from "@/components/stat-tile";
import { formatMinutes } from "@/lib/format";
import { isFitbitConnected } from "@/lib/services/fitbit-service";
import { getRecentHealthMetrics } from "@/lib/services/health-service";
import { SyncNowButton } from "./sync-now-button";

const RANGE_DAYS = 14;

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

  const metrics = await getRecentHealthMetrics(RANGE_DAYS).catch(() => []);
  // Google's daily rollup only ever covers completed civil days — "today"
  // has no data until it's over, so this picks the most recent day that
  // actually has each metric rather than mislabeling yesterday's number
  // as today's.
  const latestSteps = metrics.find((m) => m.steps != null);
  const latestHeartRate = metrics.find((m) => m.restingHeartRate != null);
  const latestSleep = metrics.find((m) => m.sleepMinutes != null);

  const tiles: StatTileData[] = [
    {
      label: "Steps",
      value: latestSteps ? latestSteps.steps!.toLocaleString() : "—",
      hint: latestSteps?.date,
    },
    {
      label: "Resting heart rate",
      value: latestHeartRate ? `${latestHeartRate.restingHeartRate} bpm` : "—",
      hint: latestHeartRate?.date,
    },
    {
      label: "Sleep",
      value: latestSleep ? formatMinutes(latestSleep.sleepMinutes!) : "—",
      hint: latestSleep?.date,
    },
  ];

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

      <StatTileRow tiles={tiles} className="sm:grid-cols-3" />

      <Card>
        <CardHeader>
          <CardTitle>Last {RANGE_DAYS} days</CardTitle>
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
