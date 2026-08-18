"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Habit } from "@/lib/services/habit-service";
import { clearHabitLogTodayAction, logHabitTodayAction } from "./actions";

type TodayLogValue = {
  valueBoolean: boolean | null;
  valueNumeric: number | null;
  valueSeconds: number | null;
};

function secondsToHMM(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hmmToSeconds(hmm: string) {
  const [h, m] = hmm.split(":").map(Number);
  return h * 3600 + m * 60;
}

export function LogControl({
  habit,
  todayLog,
}: {
  habit: Habit;
  todayLog?: TodayLogValue;
}) {
  const [saving, setSaving] = useState(false);
  const [numericValue, setNumericValue] = useState(
    todayLog?.valueNumeric?.toString() ?? "",
  );
  const [minutesValue, setMinutesValue] = useState(
    todayLog?.valueSeconds != null ? String(Math.round(todayLog.valueSeconds / 60)) : "",
  );
  const [timeValue, setTimeValue] = useState(
    todayLog?.valueSeconds != null ? secondsToHMM(todayLog.valueSeconds) : "",
  );

  if (habit.trackingType === "boolean") {
    const done = todayLog?.valueBoolean === true;
    return (
      <Button
        type="button"
        size="icon"
        variant={done ? "default" : "outline"}
        disabled={saving}
        aria-label={done ? "Mark not done" : "Mark done"}
        onClick={async () => {
          setSaving(true);
          if (done) {
            await clearHabitLogTodayAction(habit.id);
          } else {
            await logHabitTodayAction(habit.id, { valueBoolean: true });
          }
          setSaving(false);
        }}
      >
        <Check className={cn("size-4", !done && "opacity-30")} />
      </Button>
    );
  }

  if (habit.trackingType === "numeric" || habit.trackingType === "counter") {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          step="any"
          min={0}
          value={numericValue}
          onChange={(e) => setNumericValue(e.target.value)}
          className="h-8 w-20"
          placeholder={habit.unit ?? "0"}
        />
        <Button
          type="button"
          size="sm"
          disabled={saving || numericValue === ""}
          onClick={async () => {
            setSaving(true);
            await logHabitTodayAction(habit.id, { valueNumeric: Number(numericValue) });
            setSaving(false);
          }}
        >
          Log
        </Button>
      </div>
    );
  }

  if (habit.trackingType === "duration") {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          step="1"
          min={0}
          value={minutesValue}
          onChange={(e) => setMinutesValue(e.target.value)}
          className="h-8 w-20"
          placeholder="min"
        />
        <Button
          type="button"
          size="sm"
          disabled={saving || minutesValue === ""}
          onClick={async () => {
            setSaving(true);
            await logHabitTodayAction(habit.id, {
              valueSeconds: Number(minutesValue) * 60,
            });
            setSaving(false);
          }}
        >
          Log
        </Button>
      </div>
    );
  }

  // time
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="time"
        value={timeValue}
        onChange={(e) => setTimeValue(e.target.value)}
        className="h-8 w-28"
      />
      <Button
        type="button"
        size="sm"
        disabled={saving || timeValue === ""}
        onClick={async () => {
          setSaving(true);
          await logHabitTodayAction(habit.id, { valueSeconds: hmmToSeconds(timeValue) });
          setSaving(false);
        }}
      >
        Log
      </Button>
    </div>
  );
}
