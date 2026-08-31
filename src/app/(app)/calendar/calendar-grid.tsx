"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DailyScorePoint, DayDetail } from "@/lib/services/analytics-service";
import { getDayDetailAction } from "./actions";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MAX_DOTS_PER_DAY = 3;

function scoreClass(score: number | null): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 0.75) return "bg-primary text-primary-foreground";
  if (score >= 0.4) return "bg-primary/40";
  return "bg-destructive/15 text-destructive";
}

function formatEventTime(startAt: string, isAllDay: boolean) {
  if (isAllDay) return "All day";
  return new Date(startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function CalendarGrid({
  series,
  firstWeekday,
  eventColorsByDate,
}: {
  series: DailyScorePoint[];
  firstWeekday: number;
  eventColorsByDate: Map<string, string[]>;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [loading, startLoading] = useTransition();

  const cells: (DailyScorePoint | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...series,
  ];

  function openDay(day: DailyScorePoint) {
    setOpen(true);
    setDetail(null);
    startLoading(async () => {
      const result = await getDayDetailAction(day.date);
      setDetail(result);
    });
  }

  return (
    <>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-xs text-muted-foreground">
            {label}
          </div>
        ))}
        {cells.map((day, i) =>
          day ? (
            <button
              key={day.date}
              type="button"
              onClick={() => openDay(day)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-md text-sm font-medium transition-opacity hover:opacity-80",
                scoreClass(day.score),
              )}
            >
              {Number(day.date.slice(8, 10))}
              {(eventColorsByDate.get(day.date)?.length ?? 0) > 0 ? (
                <div className="flex gap-0.5">
                  {eventColorsByDate
                    .get(day.date)!
                    .slice(0, MAX_DOTS_PER_DAY)
                    .map((color, dotIndex) => (
                      <span
                        key={dotIndex}
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                </div>
              ) : null}
            </button>
          ) : (
            <div key={`blank-${i}`} />
          ),
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{detail?.date ?? "Loading…"}</DialogTitle>
          </DialogHeader>
          {loading || !detail ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-3">
              <p className="text-2xl font-semibold tracking-tight">
                {detail.score != null ? `${Math.round(detail.score * 100)}%` : "—"}
              </p>
              {detail.events.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Events</p>
                  <ul className="divide-y">
                    {detail.events.map((e) => (
                      <li key={e.id} className="flex items-center gap-2 py-1.5 text-sm">
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                        <span className="flex-1 truncate">{e.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatEventTime(e.startAt, e.isAllDay)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detail.todos.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Todos</p>
                  <ul className="divide-y">
                    {detail.todos.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                        <span className="flex-1 truncate">{t.title}</span>
                        {t.completed ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <X className="size-4 text-muted-foreground" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Habits</p>
                {detail.habits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing was scheduled this day.</p>
                ) : (
                  <ul className="divide-y">
                    {detail.habits.map((h) => (
                      <li key={h.id} className="flex items-center gap-2 py-1.5 text-sm">
                        {h.icon ? <span>{h.icon}</span> : null}
                        <span className="flex-1">{h.name}</span>
                        {h.completed ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <X className="size-4 text-muted-foreground" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
