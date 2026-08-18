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

function scoreClass(score: number | null): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 0.75) return "bg-primary text-primary-foreground";
  if (score >= 0.4) return "bg-primary/40";
  return "bg-destructive/15 text-destructive";
}

export function CalendarGrid({
  series,
  firstWeekday,
}: {
  series: DailyScorePoint[];
  firstWeekday: number;
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
                "flex aspect-square items-center justify-center rounded-md text-sm font-medium transition-opacity hover:opacity-80",
                scoreClass(day.score),
              )}
            >
              {Number(day.date.slice(8, 10))}
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
              {detail.habits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing was scheduled this day.
                </p>
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
