import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/services/calendar-service";

type DayTodo = { id: string; title: string; completed: boolean };

function scoreClass(score: number | null | undefined): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 0.75) return "bg-primary text-primary-foreground";
  if (score >= 0.4) return "bg-primary/40";
  return "bg-destructive/15 text-destructive";
}

function formatEventTime(startAt: string, isAllDay: boolean) {
  if (isAllDay) return "All day";
  return new Date(startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDayHeading(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function WeekView({
  dates,
  scoreByDate,
  eventsByDate,
  todosByDate,
}: {
  dates: string[];
  scoreByDate: Map<string, number | null>;
  eventsByDate: Map<string, CalendarEvent[]>;
  todosByDate: Map<string, DayTodo[]>;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-2">
      {dates.map((date) => {
        const events = eventsByDate.get(date) ?? [];
        const todos = todosByDate.get(date) ?? [];
        const score = scoreByDate.get(date);

        return (
          <Card key={date} className={date === today ? "ring-1 ring-primary/40" : undefined}>
            <CardContent className="space-y-2">
              <Link
                href={`/calendar?view=day&date=${date}`}
                className="flex items-center gap-2 hover:underline"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    scoreClass(score),
                  )}
                >
                  {Number(date.slice(8, 10))}
                </span>
                <span className="text-sm font-medium">{formatDayHeading(date)}</span>
              </Link>

              {events.length === 0 && todos.length === 0 ? (
                <p className="pl-9 text-xs text-muted-foreground">Nothing scheduled.</p>
              ) : (
                <div className="space-y-1 pl-9">
                  {events.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: e.calendarColor }} />
                      <span className="flex-1 truncate">{e.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatEventTime(e.startAt, e.isAllDay)}
                      </span>
                    </div>
                  ))}
                  {todos.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {todos.filter((t) => t.completed).length}/{todos.length} todos due
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
