"use client";

import { useTransition } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FoodLogEntry, MealType } from "@/lib/services/nutrition-service";
import { deleteMealLogAction } from "./actions";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function EntryRow({ entry }: { entry: FoodLogEntry }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
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
        onClick={() => startTransition(() => deleteMealLogAction(entry.id))}
      >
        <Trash2 className="size-4" />
      </Button>
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

  return (
    <div className="space-y-3">
      {MEAL_ORDER.filter((meal) => byMeal.has(meal)).map((meal) => (
        <div key={meal}>
          <p className="text-xs font-medium text-muted-foreground">{MEAL_LABELS[meal]}</p>
          <div className="divide-y">
            {byMeal.get(meal)!.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
