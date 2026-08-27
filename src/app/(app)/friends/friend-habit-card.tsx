"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMinutes } from "@/lib/format";
import type { FriendHabit, FriendHabitLog } from "@/lib/services/friend-service";

function formatClockSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const period = h < 12 ? "AM" : "PM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m).padStart(2, "0")} ${period}`;
}

function formatLogValue(log: FriendHabitLog, habit: FriendHabit): string {
  switch (habit.trackingType) {
    case "boolean":
      return log.completed ? "Done" : "Not done";
    case "numeric":
    case "counter":
      return log.valueNumeric != null ? `${log.valueNumeric}${habit.unit ? ` ${habit.unit}` : ""}` : "—";
    case "duration":
      return log.valueSeconds != null ? formatMinutes(log.valueSeconds / 60) : "—";
    case "time":
      return log.valueSeconds != null ? formatClockSeconds(log.valueSeconds) : "—";
  }
}

function formatDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FriendHabitCard({ habit }: { habit: FriendHabit }) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
            {habit.icon || "•"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{habit.name}</p>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="size-3.5" />
              {habit.streak.currentStreak} day streak · {Math.round(habit.streak.completionRate * 100)}% completion
            </span>
          </div>
          <Badge variant="outline" className="shrink-0">
            {habit.logs.length} logged
          </Badge>
        </div>

        {habit.logs.length > 0 ? (
          <div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowHistory((v) => !v)}
              className="w-full justify-between px-2"
            >
              History
              {showHistory ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
            {showHistory ? (
              <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
                {habit.logs.map((log) => (
                  <div key={log.logDate} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
                    <span className="text-muted-foreground">{formatDate(log.logDate)}</span>
                    <span className="font-medium">{formatLogValue(log, habit)}</span>
                    {log.note ? <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{log.note}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
