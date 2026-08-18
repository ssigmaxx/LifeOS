import {
  BarChart3,
  BookOpen,
  ListChecks,
  Dumbbell,
  Moon,
  Timer,
  Wind,
  Droplets,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMinutes, formatMl } from "@/lib/format";
import { average } from "@/lib/stats";
import {
  getDailyScoreSeries,
  getFastingAnalytics,
  getHabitsAnalytics,
  getJournalAnalytics,
  getMeditationAnalytics,
  getSleepAnalytics,
  getWaterAnalytics,
  getWorkoutAnalytics,
  resolveRange,
  type RangePreset,
} from "@/lib/services/analytics-service";
import { RangeSelector } from "./range-selector";
import { ScoreTrendChart } from "./score-trend-chart";
import { HabitComparison } from "./habit-comparison";
import { MetricCard } from "./metric-card";
import { Heatmap } from "./heatmap";

const VALID_RANGES: RangePreset[] = ["7d", "30d", "90d", "6m", "1y"];

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range: RangePreset = VALID_RANGES.includes(rangeParam as RangePreset)
    ? (rangeParam as RangePreset)
    : "30d";
  const dateRange = resolveRange(range);
  const yearRange = resolveRange("1y");

  const [habits, sleep, water, fasting, meditation, workout, journal, scoreSeries, yearSeries] =
    await Promise.all([
      getHabitsAnalytics(dateRange),
      getSleepAnalytics(dateRange),
      getWaterAnalytics(dateRange),
      getFastingAnalytics(dateRange),
      getMeditationAnalytics(dateRange),
      getWorkoutAnalytics(dateRange),
      getJournalAnalytics(dateRange),
      getDailyScoreSeries(dateRange),
      getDailyScoreSeries(yearRange),
    ]);

  const avgHabitCompletion = average(habits.map((h) => h.completionRate));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Trends across everything you&apos;re tracking.
          </p>
        </div>
        <RangeSelector current={range} />
      </div>

      <Card>
        <CardContent>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Daily score trend</p>
          <ScoreTrendChart series={scoreSeries} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          icon={ListChecks}
          title="Habits"
          stats={[
            { label: "Active", value: String(habits.length) },
            {
              label: "Avg completion",
              value: avgHabitCompletion != null ? pct(avgHabitCompletion) : "—",
            },
          ]}
        />
        <MetricCard
          icon={Moon}
          title="Sleep"
          stats={[
            { label: "Average", value: sleep.avgMinutes != null ? formatMinutes(sleep.avgMinutes) : "—" },
            { label: "Range", value: sleep.minMinutes != null && sleep.maxMinutes != null ? `${formatMinutes(sleep.minMinutes)}–${formatMinutes(sleep.maxMinutes)}` : "—" },
          ]}
        />
        <MetricCard
          icon={Droplets}
          title="Water"
          stats={[
            { label: "Average", value: water.avgMl != null ? formatMl(Math.round(water.avgMl)) : "—" },
            { label: "Hit target", value: pct(water.targetAchievementRate) },
          ]}
        />
        <MetricCard
          icon={Timer}
          title="Fasting"
          stats={[
            { label: "Average", value: fasting.avgMinutes != null ? formatMinutes(fasting.avgMinutes) : "—" },
            { label: "Longest", value: fasting.longestMinutes != null ? formatMinutes(fasting.longestMinutes) : "—" },
          ]}
        />
        <MetricCard
          icon={Wind}
          title="Meditation"
          stats={[
            { label: "Total", value: formatMinutes(meditation.totalMinutes) },
            { label: "Avg session", value: meditation.avgSessionMinutes != null ? formatMinutes(meditation.avgSessionMinutes) : "—" },
          ]}
        />
        <MetricCard
          icon={Dumbbell}
          title="Gym"
          stats={[
            { label: "Sessions", value: String(workout.sessionCount) },
            { label: "Total time", value: formatMinutes(workout.totalMinutes) },
          ]}
        />
        <MetricCard
          icon={BookOpen}
          title="Journal"
          stats={[
            { label: "Morning", value: pct(journal.morningRate) },
            { label: "Evening", value: pct(journal.eveningRate) },
          ]}
        />
      </div>

      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Compare habits</p>
          <HabitComparison habits={habits} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Past year, daily score
            </p>
          </div>
          <Heatmap series={yearSeries} />
        </CardContent>
      </Card>
    </div>
  );
}
