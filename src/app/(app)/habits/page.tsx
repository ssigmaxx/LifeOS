import { Plus, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { listCategories, listHabits, getTodayLogs } from "@/lib/services/habit-service";
import { CategoryFormDialog } from "./category-form-dialog";
import { HabitCard } from "./habit-card";
import { HabitFormDialog } from "./habit-form-dialog";

export default async function HabitsPage() {
  const [habits, categories, todayLogs] = await Promise.all([
    listHabits(),
    listCategories(),
    getTodayLogs(),
  ]);

  const activeHabits = habits.filter((h) => h.isActive);
  const inactiveHabits = habits.filter((h) => !h.isActive);

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
              activeHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  categories={categories}
                  todayLog={todayLogs[habit.id]}
                />
              ))
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
