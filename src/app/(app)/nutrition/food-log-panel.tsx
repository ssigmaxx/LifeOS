"use client";

import { useState, useTransition } from "react";
import { Plus, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { MealType } from "@/lib/services/nutrition-service";
import type { OpenFoodFactsResult } from "@/lib/nutrition/open-food-facts";
import { logFoodAction, searchFoodAction } from "./actions";

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

type Per100g = { caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number };

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
  const [isPending, startTransition] = useTransition();

  function confirm() {
    const quantityGrams = Number(quantity);
    if (!quantityGrams || quantityGrams <= 0) {
      onError("Enter a portion size greater than 0.");
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
      } else {
        setExpanded(false);
        onLogged();
      }
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
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
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

    startTransition(async () => {
      const result = await logFoodAction({
        mealType,
        foodName: name.trim(),
        source: "estimate",
        quantityGrams,
        caloriesPer100g: Number(calories) || 0,
        proteinPer100g: Number(protein) || 0,
        carbsPer100g: Number(carbs) || 0,
        fatPer100g: Number(fat) || 0,
      });
      if (result.error) {
        onError(result.error);
      } else {
        onLogged(name.trim());
        setOpen(false);
        setName("");
        setCalories("");
        setProtein("");
        setCarbs("");
        setFat("");
        setQuantity("100");
      }
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
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
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
      </CardContent>
    </Card>
  );
}

export function FoodLogPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenFoodFactsResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function search() {
    if (!query.trim()) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const found = await searchFoodAction(query.trim());
      setResults(found);
      setSearched(true);
    });
  }

  return (
    <div className="space-y-3">
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
