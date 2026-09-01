import { BookOpen, Droplets, Dumbbell, Leaf, ListChecks, ListTodo, Utensils, Wind } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { IconBadge, type IconBadgeTone } from "@/components/icon-badge";
import { RadialProgress } from "@/components/radial-progress";
import { getDailyRecap } from "@/lib/services/daily-recap-service";
import { formatMinutes, formatMl } from "@/lib/format";

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
