import { BookOpen, Clock, Droplets, Dumbbell, Leaf, ListChecks, ListTodo, Utensils, Wind } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { IconBadge, type IconBadgeTone } from "@/components/icon-badge";
import { RadialProgress } from "@/components/radial-progress";
import { Timeline, TimelineItem } from "@/components/timeline";
import { EmptyState } from "@/components/empty-state";
import { getDailyRecap, type RecapTimelineEntry } from "@/lib/services/daily-recap-service";
import { formatClockTime, formatMinutes, formatMl } from "@/lib/format";

const TIMELINE_ICON = { water: Droplets, workout: Dumbbell, meditation: Wind, journal: BookOpen } as const;
const TIMELINE_TONE: Record<RecapTimelineEntry["kind"], IconBadgeTone> = {
  water: "blue",
  workout: "rose",
  meditation: "teal",
  journal: "amber",
};

function timelineTitle(entry: RecapTimelineEntry): string {
  switch (entry.kind) {
    case "water":
      return `Logged ${formatMl(entry.amountMl)} of water`;
    case "workout":
      return entry.workoutType ? `Workout · ${entry.workoutType}` : "Workout logged";
    case "meditation":
      return "Meditation";
    case "journal":
      return entry.entryType === "morning" ? "Morning journal entry" : "Evening journal entry";
  }
}

function timelineSubtitle(entry: RecapTimelineEntry): string | null {
  switch (entry.kind) {
    case "workout":
      return entry.durationMinutes != null ? formatMinutes(entry.durationMinutes) : null;
    case "meditation":
      return `${formatMinutes(entry.totalMinutes)} · ${entry.sessionCount} session${entry.sessionCount === 1 ? "" : "s"}`;
    default:
      return null;
  }
}

function StatRow({
  icon,
  tone,
  label,
  value,
}: {
  icon: typeof Leaf;
  tone: IconBadgeTone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <IconBadge icon={icon} tone={tone} />
      <p className="flex-1 text-sm">{label}</p>
      <p className="text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

export default async function RecapPage() {
  const recap = await getDailyRecap();
  const scorePct = recap.score != null ? Math.round(recap.score * 100) : null;
  const dateLabel = new Date(`${recap.date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s recap</h1>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4">
          <RadialProgress value={scorePct ?? 0}>
            <span className="text-lg font-semibold tracking-tight">
              {scorePct != null ? `${scorePct}%` : "—"}
            </span>
          </RadialProgress>
          <p className="text-sm text-muted-foreground">{recap.summaryLine}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Today&apos;s timeline</h2>
        {recap.timeline.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Nothing logged yet"
            description="Water, workouts, meditation and journal entries will show up here as you log them."
          />
        ) : (
          <Card>
            <CardContent>
              <Timeline>
                {recap.timeline.map((entry, i) => {
                  const Icon = TIMELINE_ICON[entry.kind];
                  const subtitle = timelineSubtitle(entry);
                  return (
                    <TimelineItem
                      key={`${entry.kind}-${entry.time}-${i}`}
                      time={formatClockTime(new Date(entry.time))}
                      last={i === recap.timeline.length - 1}
                    >
                      <div className="flex items-center gap-2.5">
                        <IconBadge icon={Icon} tone={TIMELINE_TONE[entry.kind]} className="size-6" />
                        <div className="min-w-0">
                          <p className="truncate text-sm">{timelineTitle(entry)}</p>
                          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
                        </div>
                      </div>
                    </TimelineItem>
                  );
                })}
              </Timeline>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="divide-y py-0">
          <StatRow
            icon={ListChecks}
            tone="violet"
            label="Habits"
            value={recap.habits.total > 0 ? `${recap.habits.completed}/${recap.habits.total}` : "None due"}
          />
          <StatRow
            icon={ListTodo}
            tone="indigo"
            label="Todos"
            value={recap.todos.total > 0 ? `${recap.todos.completed}/${recap.todos.total}` : "None due"}
          />
          <StatRow
            icon={Droplets}
            tone="blue"
            label="Water"
            value={`${formatMl(recap.water.totalMl)} / ${formatMl(recap.water.targetMl)}`}
          />
          <StatRow icon={Wind} tone="teal" label="Meditation" value={formatMinutes(recap.meditation.totalMinutes)} />
          <StatRow
            icon={Dumbbell}
            tone="rose"
            label="Gym"
            value={
              recap.workout?.completed ? formatMinutes(recap.workout.durationMinutes ?? 0) : "Not logged"
            }
          />
          <StatRow
            icon={Utensils}
            tone="lime"
            label="Nutrition"
            value={
              recap.nutrition.profile
                ? `${recap.nutrition.totals.calories} / ${recap.nutrition.profile.dailyCalorieTarget} kcal`
                : "No target set"
            }
          />
          <StatRow icon={Leaf} tone="emerald" label="Carbon footprint" value={`${recap.carbonKg.toFixed(1)} kg CO₂e`} />
          <StatRow
            icon={BookOpen}
            tone="amber"
            label="Journal"
            value={
              recap.journal.morning && recap.journal.evening
                ? "Morning & evening"
                : recap.journal.morning
                  ? "Morning only"
                  : recap.journal.evening
                    ? "Evening only"
                    : "Not written"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
