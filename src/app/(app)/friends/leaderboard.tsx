import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StreakBadge } from "@/components/streak-badge";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/services/friend-service";

function RankBadge({ rank }: { rank: number }) {
  const isTopThree = rank <= 3;
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        isTopThree ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {rank}
    </span>
  );
}

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const ranked = entries.filter((e) => e.avgCompletionRate != null);
  const unranked = entries.filter((e) => e.avgCompletionRate == null);

  if (ranked.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Leaderboard</h2>
      <Card>
        <CardContent className="divide-y py-0">
          {ranked.map((entry, i) => (
            <div
              key={entry.id}
              className={cn("flex items-center gap-3 py-2.5", entry.isSelf && "-mx-4 bg-muted px-4")}
            >
              <RankBadge rank={i + 1} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", entry.isSelf && "font-medium")}>{entry.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {Math.round(entry.avgCompletionRate! * 100)}%
                  </span>
                </div>
                <Progress value={Math.round(entry.avgCompletionRate! * 100)} />
              </div>
              <StreakBadge days={entry.bestStreak} className="shrink-0" />
            </div>
          ))}
          {unranked.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 py-2.5 opacity-60">
              <span className="size-6 shrink-0" />
              <span className={cn("min-w-0 flex-1 truncate text-sm", entry.isSelf && "font-medium")}>
                {entry.label}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">Nothing shared yet</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
