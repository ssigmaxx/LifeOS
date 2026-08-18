import { cn } from "@/lib/utils";
import type { DailyScorePoint } from "@/lib/services/analytics-service";

function intensityClass(score: number | null): string {
  if (score == null) return "bg-muted";
  if (score === 0) return "bg-muted";
  if (score < 0.25) return "bg-primary/20";
  if (score < 0.5) return "bg-primary/40";
  if (score < 0.75) return "bg-primary/65";
  return "bg-primary";
}

export function Heatmap({ series }: { series: DailyScorePoint[] }) {
  if (series.length === 0) return null;

  const firstDate = new Date(`${series[0].date}T00:00:00Z`);
  const leadingBlanks = firstDate.getUTCDay(); // 0 = Sunday

  const cells: (DailyScorePoint | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...series,
  ];

  const weeks: (DailyScorePoint | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                title={day ? `${day.date}: ${day.score != null ? `${Math.round(day.score * 100)}%` : "no data"}` : undefined}
                className={cn(
                  "size-2.5 rounded-sm",
                  day ? intensityClass(day.score) : "bg-transparent",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
