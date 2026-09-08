import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared across Today, Habits, and the Friends leaderboard so a "streak"
// reads the same way everywhere instead of three slightly different
// flame+number treatments.
export function StreakBadge({ days, className }: { days: number; className?: string }) {
  if (days <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <Flame className="size-3" />
      {days}-day streak
    </span>
  );
}
