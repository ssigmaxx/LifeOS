import Link from "next/link";
import { ArrowRight, Footprints, HeartPulse, Moon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMinutes } from "@/lib/format";
import type { HealthSummary } from "@/lib/health-summary";

const STAT_COLOR = {
  steps: "var(--health-steps)",
  heart: "var(--health-heart)",
  sleep: "var(--health-sleep)",
} as const;

function MiniStat({
  icon: Icon,
  color,
  value,
  hint,
}: {
  icon: typeof Footprints;
  color: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: color }}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

// Shared by the Dashboard and Today — same numbers, same math
// (lib/health-summary.ts), so "today's resting HR" never disagrees
// between screens.
export function HealthSummaryCard({ summary, linkHref = "/health" }: { summary: HealthSummary; linkHref?: string }) {
  const { latestSteps, latestHeartRate, latestAvgHeartRate, latestSleep, readinessScore } = summary;
  if (
    latestSteps == null &&
    latestHeartRate == null &&
    latestAvgHeartRate == null &&
    latestSleep == null
  ) {
    return null;
  }

  return (
    <Link href={linkHref} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {readinessScore != null ? (
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "var(--health-readiness)" }}
              >
                {readinessScore}
              </div>
            ) : null}
            <MiniStat
              icon={Footprints}
              color={STAT_COLOR.steps}
              value={latestSteps?.steps != null ? latestSteps.steps.toLocaleString() : "—"}
              hint="Steps"
            />
            <MiniStat
              icon={HeartPulse}
              color={STAT_COLOR.heart}
              value={latestHeartRate?.restingHeartRate != null ? `${latestHeartRate.restingHeartRate} bpm` : "—"}
              hint="Resting HR"
            />
            <MiniStat
              icon={HeartPulse}
              color={STAT_COLOR.heart}
              value={latestAvgHeartRate?.avgHeartRate != null ? `${latestAvgHeartRate.avgHeartRate} bpm` : "—"}
              hint="Avg HR"
            />
            <MiniStat
              icon={Moon}
              color={STAT_COLOR.sleep}
              value={latestSleep?.sleepMinutes != null ? formatMinutes(latestSleep.sleepMinutes) : "—"}
              hint="Sleep"
            />
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            View Health <ArrowRight className="size-3.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
