import { cn } from "@/lib/utils";

export type HeatmapDay = {
  date: string; // "YYYY-MM-DD"
  /** "empty" = not scheduled that day (no signal either way). */
  level: "empty" | "missed" | "done";
};

const LEVEL_CLASSES: Record<HeatmapDay["level"], string> = {
  empty: "bg-transparent",
  missed: "bg-muted",
  done: "bg-primary",
};

// Same weeks-as-columns layout and cell size as analytics/heatmap.tsx (kept
// separate rather than shared, since that one grades score into 5
// intensities and this one is a 3-state schedule/completion calendar).
export function StreakHeatmap({ days, className }: { days: HeatmapDay[]; className?: string }) {
  if (days.length === 0) return null;

  const firstDate = new Date(`${days[0].date}T00:00:00Z`);
  const leadingBlanks = firstDate.getUTCDay();

  const cells: (HeatmapDay | null)[] = [...Array.from({ length: leadingBlanks }, () => null), ...days];

  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                title={day ? day.date : undefined}
                className={cn("size-2.5 rounded-sm", day ? LEVEL_CLASSES[day.level] : "bg-transparent")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
