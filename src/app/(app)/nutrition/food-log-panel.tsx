"use client";

import { useState, useTransition } from "react";
import { Plus, Search, Star, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { MealType, SavedFood } from "@/lib/services/nutrition-service";
import type { OpenFoodFactsResult } from "@/lib/nutrition/open-food-facts";
import { GERMAN_STORES } from "@/lib/nutrition/stores";
import { deleteSavedFoodAction, logFoodAction, saveFoodAction, searchFoodAction } from "./actions";

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

type Per100g = { caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number };

// Lets a saved food default to more than one meal, e.g. the same yogurt
// quick-added under both Breakfast and Dinner.
function MealCheckboxGroup({ selected, onChange }: { selected: MealType[]; onChange: (meals: MealType[]) => void }) {
  function toggle(meal: MealType) {
    onChange(selected.includes(meal) ? selected.filter((m) => m !== meal) : [...selected, meal]);
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {MEAL_OPTIONS.map((m) => (
        <label key={m.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox checked={selected.includes(m.value)} onCheckedChange={() => toggle(m.value)} />
          {m.label}
        </label>
      ))}
    </div>
  );
}

function AddRow({
  name,
  per100g,
  source,
  onLogged,
  onError,
}: {
  name: string;
  per100g: Per100g;
  source: "open_food_facts" | "estimate";
  onLogged: () => void;
  onError: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [quantity, setQuantity] = useState("100");
  const [mealType, setMealType] = useState<MealType>("snack");
  const [remember, setRemember] = useState(false);
  const [rememberMeals, setRememberMeals] = useState<MealType[]>(["snack"]);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    const quantityGrams = Number(quantity);
    if (!quantityGrams || quantityGrams <= 0) {
      onError("Enter a portion size greater than 0.");
      return;
    }
    if (remember && rememberMeals.length === 0) {
      onError("Pick at least one meal to remember this for.");
      return;
    }
    startTransition(async () => {
      const result = await logFoodAction({
        mealType,
        foodName: name,
        source,
        quantityGrams,
        ...per100g,
      });
      if (result.error) {
        onError(result.error);
        return;
      }
      if (remember) {
        await saveFoodAction({
          foodName: name,
          source,
          defaultQuantityGrams: quantityGrams,
          defaultMealTypes: rememberMeals,
          ...per100g,
        });
      }
      setExpanded(false);
      onLogged();
    });
  }

  return (
    <div className="rounded-lg border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">
            {Math.round(per100g.caloriesPer100g)} kcal / 100g · {per100g.proteinPer100g}g P · {per100g.carbsPer100g}g C ·{" "}
            {per100g.fatPer100g}g F
          </p>
        </div>
        <Button type="button" size="sm" variant={expanded ? "outline" : "default"} onClick={() => setExpanded((v) => !v)}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
      {expanded ? (
        <div className="mt-2.5 flex flex-wrap items-end gap-2 border-t pt-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Grams</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-8 w-24"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Meal</Label>
            <Select
              value={mealType}
              onValueChange={(v) => {
                const meal = v as MealType;
                setMealType(meal);
                setRememberMeals((prev) => (prev.length <= 1 ? [meal] : prev));
              }}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" disabled={isPending} onClick={confirm}>
            {isPending ? "Logging…" : "Confirm"}
          </Button>
          <div className="w-full space-y-1.5 pt-1">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
              Remember for quick re-logging
            </label>
            {remember ? (
              <div className="pl-5.5">
                <MealCheckboxGroup selected={rememberMeals} onChange={setRememberMeals} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ManualEntryForm({ onLogged, onError }: { onLogged: (name: string) => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [mealType, setMealType] = useState<MealType>("snack");
  const [remember, setRemember] = useState(false);
  const [rememberMeals, setRememberMeals] = useState<MealType[]>(["snack"]);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Log manually (home-cooked / generic food)
      </Button>
    );
  }

  function confirm() {
    const quantityGrams = Number(quantity);
    if (!name.trim()) return onError("Enter a food name.");
    if (!quantityGrams || quantityGrams <= 0) return onError("Enter a portion size greater than 0.");
    if (remember && rememberMeals.length === 0) return onError("Pick at least one meal to remember this for.");

    const per100g = {
      caloriesPer100g: Number(calories) || 0,
      proteinPer100g: Number(protein) || 0,
      carbsPer100g: Number(carbs) || 0,
      fatPer100g: Number(fat) || 0,
    };

    startTransition(async () => {
      const result = await logFoodAction({
        mealType,
        foodName: name.trim(),
        source: "estimate",
        quantityGrams,
        ...per100g,
      });
      if (result.error) {
        onError(result.error);
        return;
      }
      if (remember) {
        await saveFoodAction({
          foodName: name.trim(),
          source: "estimate",
          defaultQuantityGrams: quantityGrams,
          defaultMealTypes: rememberMeals,
          ...per100g,
        });
      }
      onLogged(name.trim());
      setOpen(false);
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setQuantity("100");
      setRemember(false);
      setRememberMeals(["snack"]);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-500">
          <TriangleAlert className="size-3.5" /> Manual entries are estimates — no database match.
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Food name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kartoffelsuppe" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">kcal/100g</Label>
            <Input type="number" min={0} value={calories} onChange={(e) => setCalories(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Protein/100g</Label>
            <Input type="number" min={0} value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Carbs/100g</Label>
            <Input type="number" min={0} value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fat/100g</Label>
            <Input type="number" min={0} value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Grams eaten</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-24" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Meal</Label>
            <Select
              value={mealType}
              onValueChange={(v) => {
                const meal = v as MealType;
                setMealType(meal);
                setRememberMeals((prev) => (prev.length <= 1 ? [meal] : prev));
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" disabled={isPending} onClick={confirm}>
            {isPending ? "Logging…" : "Log food"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            Remember for quick re-logging
          </label>
          {remember ? (
            <div className="pl-5.5">
              <MealCheckboxGroup selected={rememberMeals} onChange={setRememberMeals} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SavedFoodRow({
  food,
  onLogged,
  onSaved,
  onError,
}: {
  food: SavedFood;
  onLogged: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [editingDefaults, setEditingDefaults] = useState(false);
  const [quantity, setQuantity] = useState(String(food.defaultQuantityGrams));
  const [defaultMeals, setDefaultMeals] = useState<MealType[]>(food.defaultMealTypes);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  function logWith(quantityGrams: number, meal: MealType) {
    if (!quantityGrams || quantityGrams <= 0) {
      onError("Enter a portion size greater than 0.");
      return;
    }
    startTransition(async () => {
      const result = await logFoodAction({
        mealType: meal,
        foodName: food.foodName,
        source: food.source,
        quantityGrams,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
      });
      if (result.error) {
        onError(result.error);
      } else {
        onLogged();
      }
    });
  }

  function saveDefaults() {
    const quantityGrams = Number(quantity);
    if (!quantityGrams || quantityGrams <= 0) {
      onError("Enter a portion size greater than 0.");
      return;
    }
    if (defaultMeals.length === 0) {
      onError("Pick at least one meal.");
      return;
    }
    startSave(async () => {
      const result = await saveFoodAction({
        foodName: food.foodName,
        source: food.source,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        defaultQuantityGrams: quantityGrams,
        defaultMealTypes: defaultMeals,
      });
      if (result.error) {
        onError(result.error);
      } else {
        setEditingDefaults(false);
        onSaved();
      }
    });
  }

  return (
    <div className="rounded-lg border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{food.foodName}</p>
          <p className="text-xs text-muted-foreground">
            {Math.round(food.caloriesPer100g)} kcal / 100g · usually {food.defaultQuantityGrams}g
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditingDefaults((v) => !v)}>
            Edit
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Forget ${food.foodName}`}
            disabled={isDeleting}
            onClick={() => startDelete(() => deleteSavedFoodAction(food.id))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {food.defaultMealTypes.map((meal) => (
          <Button
            key={meal}
            type="button"
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => logWith(food.defaultQuantityGrams, meal)}
          >
            <Plus className="size-3.5" /> {MEAL_OPTIONS.find((m) => m.value === meal)?.label}
          </Button>
        ))}
      </div>

      {editingDefaults ? (
        <div className="mt-2.5 space-y-2 border-t pt-2.5">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Usual grams</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-8 w-24"
              />
            </div>
            <Button type="button" size="sm" disabled={isSaving} onClick={saveDefaults}>
              {isSaving ? "Saving…" : "Save defaults"}
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Quick-add to</Label>
            <MealCheckboxGroup selected={defaultMeals} onChange={setDefaultMeals} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FoodLogPanel({ savedFoods }: { savedFoods: SavedFood[] }) {
  const [query, setQuery] = useState("");
  const [store, setStore] = useState<string>("any");
  const [results, setResults] = useState<OpenFoodFactsResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [fellBackFromStore, setFellBackFromStore] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function search() {
    if (!query.trim()) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const { results: found, matchedStore } = await searchFoodAction(
        query.trim(),
        store === "any" ? undefined : store,
      );
      setResults(found);
      setSearched(true);
      setFellBackFromStore(store !== "any" && !matchedStore && found.length > 0);
    });
  }

  return (
    <div className="space-y-3">
      {savedFoods.length > 0 ? (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <Star className="size-3.5" /> Saved foods
          </Label>
          <div className="space-y-2">
            {savedFoods.map((food) => (
              <SavedFoodRow
                key={food.id}
                food={food}
                onLogged={() => setNotice(`Logged "${food.foodName}".`)}
                onSaved={() => setNotice(`Updated "${food.foodName}".`)}
                onError={setError}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label className="text-xs">Where did you buy this?</Label>
        <Select value={store} onValueChange={(v) => setStore(v ?? "any")}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any store</SelectItem>
            {GERMAN_STORES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a food, e.g. Vollmilch"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
        />
        <Button type="button" onClick={search} disabled={isPending || !query.trim()}>
          <Search className="size-4" /> Search
        </Button>
      </div>

      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {fellBackFromStore ? (
        <p className="text-sm text-muted-foreground">
          No matches tagged for {store} — showing results from all stores instead.
        </p>
      ) : null}

      {searched && results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No Open Food Facts match found. Use &quot;Log manually&quot; below for a home-cooked or generic food.
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((r, i) => (
            <AddRow
              key={i}
              name={r.brand ? `${r.name} (${r.brand})` : r.name}
              source="open_food_facts"
              per100g={{
                caloriesPer100g: r.caloriesPer100g,
                proteinPer100g: r.proteinPer100g,
                carbsPer100g: r.carbsPer100g,
                fatPer100g: r.fatPer100g,
              }}
              onLogged={() => setNotice(`Logged "${r.name}".`)}
              onError={setError}
            />
          ))}
        </div>
      ) : null}

      <ManualEntryForm onLogged={(name) => setNotice(`Logged "${name}".`)} onError={setError} />
    </div>
  );
}
