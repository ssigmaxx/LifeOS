import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { RadialProgress } from "@/components/radial-progress";
import { RingCluster, RingLegend } from "@/components/ring-cluster";
import { StatTileRow } from "@/components/stat-tile";
import { formatMinutes } from "@/lib/format";
import { getTodaySummary } from "@/lib/services/today-service";
import { listCategories } from "@/lib/services/habit-service";
import { CategoryJump } from "@/app/(app)/habits/category-jump";
import { getTodayWater } from "@/lib/services/water-service";
import { getLatestSleep } from "@/lib/services/sleep-service";
import { getCurrentFast, getLastCompletedFast } from "@/lib/services/fasting-service";
import { getTodayMeditation } from "@/lib/services/meditation-service";
import { getTodayWorkout } from "@/lib/services/workout-service";
import { getTodayEntries } from "@/lib/services/journal-service";
import { getTodayPhotos } from "@/lib/services/photo-service";
import { getDailyTotals, getNutritionProfile } from "@/lib/services/nutrition-service";
import { getTodayCarbonTotal } from "@/lib/services/carbon-service";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { intlTag } from "@/lib/i18n/locale";
import { formatTemplate, pluralize } from "@/lib/i18n/format";
import { summarizeHealthMetrics } from "@/lib/health-summary";
import { isFitbitConnected } from "@/lib/services/fitbit-service";
import { getRecentHealthMetrics } from "@/lib/services/health-service";
import { TodayHabitRow } from "./today-habit-row";
import { WaterCard } from "./water-card";
import { SleepCard } from "./sleep-card";
import { FastingCard } from "./fasting-card";
import { MeditationCard } from "./meditation-card";
import { WorkoutCard } from "./workout-card";
import { JournalCard } from "./journal-card";
import { PhotosCard } from "./photos-card";
import { NutritionCard } from "./nutrition-card";
import { FootprintCard } from "./footprint-card";
import { HealthSummaryCard } from "../health/health-summary-card";

const UNCATEGORIZED_ID = "uncategorized";

function greeting(hour: number, dict: Dictionary) {
  if (hour < 5) return dict.today.goodNight;
  if (hour < 12) return dict.today.goodMorning;
  if (hour < 18) return dict.today.goodAfternoon;
  return dict.today.goodEvening;
}

export default async function TodayPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [
    summary,
    categories,
    water,
    latestSleep,
    currentFast,
    lastFast,
    meditation,
    workout,
    journal,
    photos,
    nutritionProfile,
    nutritionTotals,
    footprint,
    fitbitConnected,
    healthMetrics,
  ] = await Promise.all([
    getTodaySummary(),
    listCategories(),
    getTodayWater(),
    getLatestSleep(),
    getCurrentFast(),
    getLastCompletedFast(),
    getTodayMeditation(),
    getTodayWorkout(),
    getTodayEntries(),
    getTodayPhotos(),
    getNutritionProfile(),
    getDailyTotals(),
    getTodayCarbonTotal(),
    isFitbitConnected().catch(() => false),
    getRecentHealthMetrics(30).catch(() => []),
  ]);
  const healthSummary = fitbitConnected ? summarizeHealthMetrics(healthMetrics) : null;
  const autoSyncedSleepMinutes = healthSummary?.latestSleep?.sleepMinutes ?? null;
  // The synced value wins when present — same "don't make me type this in"
  // reasoning as the SleepCard below.
  const displaySleepMinutes = autoSyncedSleepMinutes ?? latestSleep?.durationMinutes ?? null;

  const today = new Date();
  const dateLabel = today.toLocaleDateString(intlTag(locale), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const scorePct = summary.score != null ? Math.round(summary.score * 100) : null;

  const dueCategoryGroups = categories
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      habits: summary.dueHabits.filter((h) => h.categoryId === cat.id),
    }))
    .filter((group) => group.habits.length > 0);
  const uncategorizedDueHabits = summary.dueHabits.filter(
    (h) => h.categoryId == null || !categories.some((c) => c.id === h.categoryId),
  );
  if (uncategorizedDueHabits.length > 0) {
    dueCategoryGroups.push({
      id: UNCATEGORIZED_ID,
      name: dict.habits.uncategorized,
      habits: uncategorizedDueHabits,
    });
  }

  const habitsPct = summary.totalCount > 0 ? summary.completedCount / summary.totalCount : 0;
  const waterPct = water.targetMl > 0 ? water.totalMl / water.targetMl : 0;
  const rings = [
    {
      label: dict.today.habitsSection,
      value: habitsPct,
      valueLabel: summary.totalCount > 0 ? `${summary.completedCount}/${summary.totalCount}` : "—",
    },
    {
      label: dict.today.water,
      value: waterPct,
      valueLabel: `${(water.totalMl / 1000).toFixed(1)}/${(water.targetMl / 1000).toFixed(1)}L`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(today.getHours(), dict)}
        </h1>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <RadialProgress value={scorePct ?? 0}>
              <span className="text-lg font-semibold tracking-tight">
                {scorePct != null ? `${scorePct}%` : "—"}
              </span>
            </RadialProgress>
            <div>
              <p className="text-sm text-muted-foreground">{dict.today.todaysScore}</p>
              {summary.totalCount > 0 ? (
                <p className="text-sm font-medium">
                  {formatTemplate(dict.today.habitsDone, {
                    completed: summary.completedCount,
                    total: summary.totalCount,
                  })}
                </p>
              ) : null}
              <Link href="/recap" className="text-xs text-muted-foreground hover:underline">
                {dict.today.seeRecap}
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <RingCluster rings={rings} size={88} strokeWidth={7} />
            <RingLegend rings={rings} />
          </div>
        </CardContent>
      </Card>

      {healthSummary ? <HealthSummaryCard summary={healthSummary} /> : null}

      <StatTileRow
        tiles={[
          {
            label: dict.today.sleep,
            value: displaySleepMinutes != null ? formatMinutes(displaySleepMinutes) : "—",
            hint: autoSyncedSleepMinutes != null
              ? "Synced"
              : latestSleep?.quality != null
                ? formatTemplate(dict.today.quality, { n: latestSleep.quality })
                : latestSleep
                  ? undefined
                  : dict.today.notLogged,
            tone: "neutral",
          },
          {
            label: dict.today.meditation,
            value: formatMinutes(meditation.totalMinutes),
            hint:
              meditation.sessionCount > 0
                ? pluralize(meditation.sessionCount, dict.today.sessionOne, dict.today.sessionOther)
                : dict.today.notLogged,
            tone: "neutral",
          },
          {
            label: dict.today.workout,
            value: workout?.completed ? formatMinutes(workout.durationMinutes ?? 0) : "—",
            hint: workout?.workoutType ?? (workout?.completed ? undefined : dict.today.notLogged),
            tone: "neutral",
          },
          {
            label: dict.today.co2eToday,
            value: `${footprint.totalCo2eKg.toFixed(1)} kg`,
            tone: "neutral",
          },
        ]}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">{dict.today.habitsSection}</h2>
          <CategoryJump
            categories={dueCategoryGroups.map((g) => ({ id: g.id, name: g.name }))}
            placeholder={dict.habits.jumpToCategory}
          />
        </div>
        {summary.dueHabits.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={dict.today.noHabitsTitle}
            description={dict.today.noHabitsDescription}
            action={
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/habits" />}
              >
                {dict.today.goToHabits}
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {dueCategoryGroups.map((group) => (
              <div key={group.id} id={`category-${group.id}`} className="space-y-1.5">
                {dueCategoryGroups.length > 1 ? (
                  <p className="px-1 text-xs font-medium text-muted-foreground">{group.name}</p>
                ) : null}
                <Card>
                  <CardContent className="divide-y py-0">
                    {group.habits.map((habit) => (
                      <TodayHabitRow key={habit.id} habit={habit} />
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">{dict.today.lifestyleSection}</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <NutritionCard profile={nutritionProfile} totals={nutritionTotals} />
          <WaterCard water={water} />
          <SleepCard latest={latestSleep} autoSyncedMinutes={autoSyncedSleepMinutes} />
          <FastingCard current={currentFast} lastCompleted={lastFast} />
          <MeditationCard meditation={meditation} />
          <WorkoutCard workout={workout} />
          <JournalCard morning={journal.morning} evening={journal.evening} />
          <PhotosCard face={photos.face} body={photos.body} />
          <FootprintCard totalCo2eKg={footprint.totalCo2eKg} />
        </div>
      </div>
    </div>
  );
}
