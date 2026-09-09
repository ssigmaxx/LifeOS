"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CycleCalendar({
  selectedDate,
  periodDates,
}: {
  /** The day currently shown in the log form below — "YYYY-MM-DD". */
  selectedDate: string;
  /** Every date with a period logged, across all months. */
  periodDates: string[];
}) {
  const router = useRouter();
  const periodSet = useMemo(() => new Set(periodDates), [periodDates]);
  const todayISO = new Date().toISOString().slice(0, 10);
  const [todayYear, todayMonth] = todayISO.split("-").map(Number);

  const [cursor, setCursor] = useState(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    return { year, month: month - 1 };
  });

  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const startWeekday = (new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isCurrentMonth = cursor.year === todayYear && cursor.month === todayMonth - 1;

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const total = prev.year * 12 + prev.month + delta;
      return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
    });
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <Button size="icon-sm" variant="ghost" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-medium">{monthLabel}</p>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Next month"
          disabled={isCurrentMonth}
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={`blank-${i}`} />;
          const date = toISO(cursor.year, cursor.month, day);
          const isPeriod = periodSet.has(date);
          const isSelected = date === selectedDate;
          const isToday = date === todayISO;
          const isFuture = date > todayISO;
          return (
            <button
              key={date}
              type="button"
              disabled={isFuture}
              onClick={() => router.push(`/cycle?date=${date}`)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-sm transition-colors",
                isFuture && "cursor-not-allowed text-muted-foreground/40",
                !isFuture && !isSelected && "hover:bg-accent",
                isPeriod && !isSelected && "bg-pink-500/15 font-medium text-pink-600 dark:text-pink-400",
                isSelected && "bg-pink-500 font-medium text-white hover:bg-pink-500",
                isToday && !isSelected && "ring-1 ring-inset ring-pink-500/50",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
