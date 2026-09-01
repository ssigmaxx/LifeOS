import { Flame } from "lucide-react";
import type { TodayHabit } from "@/lib/services/today-service";
import { LogControl } from "@/app/(app)/habits/log-control";

export function TodayHabitRow({ habit }: { habit: TodayHabit }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-base">
        {habit.icon || "•"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{habit.name}</p>
        {habit.streak.currentStreak > 0 ? (
          <p className="flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
            <Flame className="size-3" />
            {habit.streak.currentStreak} day streak
          </p>
        ) : null}
      </div>
      <LogControl habit={habit} todayLog={habit.todayLog ?? undefined} />
    </div>
  );
}
