import { ChevronRight, Plus, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { listCategories, listHabits, getTodayLogs, type Habit } from "@/lib/services/habit-service";
import { summarizeToday } from "@/lib/services/today-service";
import { isLogComplete } from "@/lib/habit-completion";
import { CategoryFormDialog } from "./category-form-dialog";
import { CategoryJump } from "./category-jump";
import { HabitCard } from "./habit-card";
import { HabitFormDialog } from "./habit-form-dialog";

const UNCATEGORIZED_ID = "uncategorized";

export default async function HabitsPage() {
  const [habits, categories, todayLogs] = await Promise.all([
    listHabits(),
    listCategories(),
    getTodayLogs(),
  ]);

  const activeHabits = habits.filter((h) => h.isActive);
  const inactiveHabits = habits.filter((h) => !h.isActive);

  // Reuses the same due-today/completion logic Today's score is built from,
  // so a category's "3/5 today" count always agrees with the score.
  const summary = summarizeToday(habits, todayLogs);
  const dueTodayIds = new Set(summary.dueHabits.map((h) => h.id));
  const doneTodayIds = new Set(
    summary.dueHabits.filter((h) => h.todayLog && isLogComplete(h.trackingType, h.todayLog)).map((h) => h.id),
  );

  const categoryGroups = categories
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      habits: activeHabits.filter((h) => h.categoryId === cat.id),
    }))
    .filter((group) => group.habits.length > 0);

  const uncategorizedHabits = activeHabits.filter(
    (h) => h.categoryId == null || !categories.some((c) => c.id === h.categoryId),
  );
  if (uncategorizedHabits.length > 0) {
    categoryGroups.push({ id: UNCATEGORIZED_ID, name: "Uncategorized", habits: uncategorizedHabits });
  }

  function groupCounts(groupHabits: Habit[]) {
    const dueCount = groupHabits.filter((h) => dueTodayIds.has(h.id)).length;
    const doneCount = groupHabits.filter((h) => doneTodayIds.has(h.id)).length;
    return { dueCount, doneCount };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage the habits you&apos;re tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <CategoryFormDialog />
          <HabitFormDialog
            categories={categories}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Habit
              </Button>
            }
          />
        </div>
      </div>

      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Score weight</span> sets how much a habit
        moves your daily score relative to the others — the default is 1, so a habit weighted 2
        counts twice as much and 0 tracks it without affecting the score at all. It feeds every
        score you see: Today, Recap, and the Analytics trend chart. Set it from a habit&apos;s
        edit menu.
      </p>

      {habits.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No habits yet"
          description="Create your first habit to start tracking."
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            {activeHabits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active habits.</p>
            ) : (
              <>
                <CategoryJump categories={categoryGroups.map((g) => ({ id: g.id, name: g.name }))} />
                <div className="space-y-2">
                  {categoryGroups.map((group) => {
                    const { dueCount, doneCount } = groupCounts(group.habits);
                    return (
                      <details
                        key={group.id}
                        id={`category-${group.id}`}
                        className="group rounded-xl border bg-card"
                        open
                      >
                        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                          <span className="font-medium">{group.name}</span>
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            {dueCount > 0
                              ? `${doneCount}/${dueCount} today`
                              : `${group.habits.length} habit${group.habits.length === 1 ? "" : "s"}`}
                          </span>
                        </summary>
                        <div className="space-y-2 border-t px-3 pt-2 pb-3">
                          {group.habits.map((habit) => (
                            <HabitCard
                              key={habit.id}
                              habit={habit}
                              categories={categories}
                              todayLog={todayLogs[habit.id]}
                            />
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {inactiveHabits.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Paused &amp; archived
              </h2>
              {inactiveHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  categories={categories}
                  todayLog={todayLogs[habit.id]}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
