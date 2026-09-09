import { ChevronRight, Plus, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { listCategories, listHabits, getTodayLogs, type Habit } from "@/lib/services/habit-service";
import { summarizeToday } from "@/lib/services/today-service";
import { isLogComplete } from "@/lib/habit-completion";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatTemplate, pluralize } from "@/lib/i18n/format";
import { CategoryFormDialog } from "./category-form-dialog";
import { CategoryJump } from "./category-jump";
import { CategoryMenu } from "./category-menu";
import { HabitCard } from "./habit-card";
import { HabitFormDialog } from "./habit-form-dialog";

const UNCATEGORIZED_ID = "uncategorized";

export default async function HabitsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

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
    categoryGroups.push({ id: UNCATEGORIZED_ID, name: dict.habits.uncategorized, habits: uncategorizedHabits });
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
          <h1 className="text-2xl font-semibold tracking-tight">{dict.habits.title}</h1>
          <p className="text-sm text-muted-foreground">{dict.habits.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <CategoryFormDialog dict={dict.habits.categoryDialog} />
          <HabitFormDialog
            categories={categories}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> {dict.habits.habitButton}
              </Button>
            }
          />
        </div>
      </div>

      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        {dict.habits.scoreWeightNote}
      </p>

      {habits.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={dict.habits.noHabitsTitle}
          description={dict.habits.noHabitsDescription}
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            {activeHabits.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dict.habits.noActiveHabits}</p>
            ) : (
              <>
                <CategoryJump
                  categories={categoryGroups.map((g) => ({ id: g.id, name: g.name }))}
                  placeholder={dict.habits.jumpToCategory}
                />
                <div className="space-y-2">
                  {categoryGroups.map((group) => {
                    const { dueCount, doneCount } = groupCounts(group.habits);
                    return (
                      <details
                        key={group.id}
                        id={`category-${group.id}`}
                        className="group relative rounded-xl border bg-card"
                        open
                      >
                        <summary
                          className={cn(
                            "flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden",
                            group.id !== UNCATEGORIZED_ID && "pr-11",
                          )}
                        >
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                          <span className="font-medium">{group.name}</span>
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            {dueCount > 0
                              ? `${doneCount}/${dueCount} ${dict.habits.todaySuffix}`
                              : pluralize(
                                  group.habits.length,
                                  dict.habits.habitCountOne,
                                  dict.habits.habitCountOther,
                                )}
                          </span>
                        </summary>
                        {group.id !== UNCATEGORIZED_ID ? (
                          <div className="absolute top-1.5 right-2">
                            <CategoryMenu
                              categoryId={group.id}
                              categoryName={group.name}
                              dict={{
                                ...dict.habits.categoryMenu,
                                deleteTitle: formatTemplate(dict.habits.categoryMenu.deleteTitle, {
                                  name: group.name,
                                }),
                              }}
                            />
                          </div>
                        ) : null}
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
                {dict.habits.pausedArchived}
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
