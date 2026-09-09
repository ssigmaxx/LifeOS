import type { TodayHabit } from "@/lib/services/today-service";
import { LogControl } from "@/app/(app)/habits/log-control";
import { StreakBadge } from "@/components/streak-badge";

export function TodayHabitRow({ habit }: { habit: TodayHabit }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-base">
        {habit.icon || "•"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{habit.name}</p>
        <StreakBadge days={habit.streak.currentStreak} className="mt-0.5" />
      </div>
      <LogControl habit={habit} todayLog={habit.todayLog ?? undefined} />
    </div>
  );
}
