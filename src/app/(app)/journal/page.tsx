import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { getTodayEntries, listJournalEntries } from "@/lib/services/journal-service";
import { listGoals } from "@/lib/services/goal-service";
import { JournalCard } from "@/app/(app)/today/journal-card";
import { SearchForm } from "./search-form";
import { EntryCard } from "./entry-card";

function formatDateHeading(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateISO === today) return "Today";
  if (dateISO === yesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const [today, entries, goals] = await Promise.all([
    getTodayEntries(),
    listJournalEntries({ search }),
    listGoals(),
  ]);
  const activeGoals = goals.filter((g) => g.status === "active");

  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const list = groups.get(entry.entryDate) ?? [];
    list.push(entry);
    groups.set(entry.entryDate, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <p className="text-sm text-muted-foreground">
          Morning and evening reflections, searchable by text.
        </p>
      </div>

      <JournalCard morning={today.morning} evening={today.evening} />

      {activeGoals.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Your active goals</h2>
            <Link href="/goals" className="text-xs text-muted-foreground hover:underline">
              View goals
            </Link>
          </div>
          <Card>
            <CardContent className="space-y-3 py-4">
              {activeGoals.map((g) => {
                const pct = Math.round(g.progressRatio * 100);
                return (
                  <div key={g.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="space-y-3">
        <SearchForm defaultValue={search ?? ""} />

        {groups.size === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={search ? "No entries match your search" : "No journal entries yet"}
            description={search ? "Try a different search term." : "Log your first entry above."}
          />
        ) : (
          Array.from(groups.entries()).map(([dateISO, dayEntries]) => (
            <Card key={dateISO}>
              <CardContent className="py-2">
                <p className="pb-1 text-sm font-medium">{formatDateHeading(dateISO)}</p>
                <div className="divide-y">
                  {dayEntries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
