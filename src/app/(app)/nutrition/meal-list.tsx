"use client";

import { useState, useTransition } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FoodLogEntry, MealType } from "@/lib/services/nutrition-service";
import { deleteMealLogAction } from "./actions";

const COLUMN_MEALS: MealType[] = ["breakfast", "lunch", "dinner"];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const MEAL_STYLES: Record<MealType, { section: string; header: string }> = {
  breakfast: {
    section: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
    header: "text-amber-800 dark:text-amber-400",
  },
  lunch: {
    section: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40",
    header: "text-sky-800 dark:text-sky-400",
  },
  dinner: {
    section: "border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40",
    header: "text-violet-800 dark:text-violet-400",
  },
  snack: {
    section: "border-border bg-muted/40",
    header: "text-muted-foreground",
  },
};

function EntryRow({ entry }: { entry: FoodLogEntry }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-sm">
          {entry.foodName} <span className="text-muted-foreground">· {entry.quantityGrams}g</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {entry.calories} kcal · {entry.proteinG}g P · {entry.carbsG}g C · {entry.fatG}g F
          {entry.isEstimate ? (
            <span className="ml-1 inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-500">
              <TriangleAlert className="size-3" /> estimate
            </span>
          ) : null}
        </p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Delete ${entry.foodName}`}
        disabled={isPending}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{entry.foodName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from today&apos;s log and today&apos;s totals. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setDeleteOpen(false);
                startTransition(() => deleteMealLogAction(entry.id));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MealColumn({ meal, entries }: { meal: MealType; entries: FoodLogEntry[] }) {
  const calories = entries.reduce((sum, e) => sum + e.calories, 0);
  const styles = MEAL_STYLES[meal];

  return (
    <div className={`flex flex-col gap-2 rounded-lg border p-3 ${styles.section}`}>
      <div className={`flex items-baseline justify-between text-sm font-medium ${styles.header}`}>
        <span>{MEAL_LABELS[meal]}</span>
        <span>{calories} kcal</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing logged yet.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MealList({ entries }: { entries: FoodLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing logged today yet.</p>;
  }

  const byMeal = new Map<MealType, FoodLogEntry[]>();
  for (const entry of entries) {
    const list = byMeal.get(entry.mealType) ?? [];
    list.push(entry);
    byMeal.set(entry.mealType, list);
  }

  const snacks = byMeal.get("snack") ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {COLUMN_MEALS.map((meal) => (
          <MealColumn key={meal} meal={meal} entries={byMeal.get(meal) ?? []} />
        ))}
      </div>
      {snacks.length > 0 ? <MealColumn meal="snack" entries={snacks} /> : null}
    </div>
  );
}
