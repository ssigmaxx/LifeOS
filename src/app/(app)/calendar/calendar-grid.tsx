"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DailyScorePoint, DayDetail } from "@/lib/services/analytics-service";
import { getDayDetailAction } from "./actions";
import { DayDetailContent } from "./day-detail-content";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MAX_DOTS_PER_DAY = 3;

function scoreClass(score: number | null): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 0.75) return "bg-primary text-primary-foreground";
  if (score >= 0.4) return "bg-primary/40";
  return "bg-destructive/15 text-destructive";
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
            <DayDetailContent detail={detail} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
