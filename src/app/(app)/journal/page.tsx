import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getTodayEntries, listJournalEntries } from "@/lib/services/journal-service";
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
  const [today, entries] = await Promise.all([
    getTodayEntries(),
    listJournalEntries({ search }),
  ]);

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

      <div className="space-y-3">
        <SearchForm defaultValue={search ?? ""} />

        {groups.size === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <BookOpen className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {search ? "No entries match your search" : "No journal entries yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {search ? "Try a different search term." : "Log your first entry above."}
                </p>
              </div>
            </CardContent>
          </Card>
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
