"use client";

import { useActionState, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActivityLevel, NutritionGoal, Sex } from "@/lib/nutrition-calc";
import type { NutritionProfile } from "@/lib/services/nutrition-service";
import { saveNutritionProfileAction, type SaveProfileResult } from "./actions";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Sedentary", hint: "Little or no exercise" },
  { value: "light", label: "Lightly active", hint: "Exercise 1-3 days/week" },
  { value: "moderate", label: "Moderately active", hint: "Exercise 3-5 days/week" },
  { value: "active", label: "Active", hint: "Exercise 6-7 days/week" },
  { value: "very_active", label: "Very active", hint: "Physical job or 2x/day training" },
];

const initialState: SaveProfileResult = { error: null, plan: null };

export function NutritionProfileForm({ profile }: { profile: NutritionProfile | null }) {
  const [state, formAction, isPending] = useActionState(saveNutritionProfileAction, initialState);
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "female");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activityLevel ?? "moderate");
  const [goal, setGoal] = useState<NutritionGoal>(profile?.goal ?? "maintain");

  return (
    <div className="space-y-4">
      <form
        action={(formData) => {
          formData.set("sex", sex);
          formData.set("activityLevel", activityLevel);
          formData.set("goal", goal);
          formAction(formData);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input id="age" name="age" type="number" min={10} max={120} defaultValue={profile?.age} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sex-select">Sex</Label>
            <Select value={sex} onValueChange={(v) => setSex(v as Sex)}>
              <SelectTrigger id="sex-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="heightCm">Height (cm)</Label>
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              min={1}
              step="0.1"
              defaultValue={profile?.heightCm}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weightKg">Weight (kg)</Label>
            <Input
              id="weightKg"
              name="weightKg"
              type="number"
              min={1}
              step="0.1"
              defaultValue={profile?.weightKg}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="activity-select">Activity level</Label>
          <Select value={activityLevel} onValueChange={(v) => setActivityLevel(v as ActivityLevel)}>
            <SelectTrigger id="activity-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} — {opt.hint}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal-select">Goal</Label>
          <Select value={goal} onValueChange={(v) => setGoal(v as NutritionGoal)}>
            <SelectTrigger id="goal-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lose">Lose weight</SelectItem>
              <SelectItem value="maintain">Maintain weight</SelectItem>
              <SelectItem value="gain">Gain weight</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {goal !== "maintain" ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetWeightChangeKg">Desired change (kg)</Label>
              <Input
                id="targetWeightChangeKg"
                name="targetWeightChangeKg"
                type="number"
                min={0.1}
                step="0.1"
                defaultValue={profile?.targetWeightChangeKg ?? undefined}
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeframeWeeks">Timeframe (weeks)</Label>
              <Input
                id="timeframeWeeks"
                name="timeframeWeeks"
                type="number"
                min={1}
                defaultValue={profile?.timeframeWeeks ?? undefined}
                placeholder="e.g. 10"
              />
            </div>
          </div>
        ) : null}

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Calculating…" : "Calculate target"}
        </Button>
      </form>

      {state.plan ? (
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-muted-foreground">BMI</span>
            <span>
              {state.plan.bmi} ({state.plan.bmiCategory.replace("_", " ")})
            </span>
            <span className="text-muted-foreground">BMR</span>
            <span>{state.plan.bmr} kcal/day</span>
            <span className="text-muted-foreground">Maintenance (TDEE)</span>
            <span>{state.plan.tdee} kcal/day</span>
            <span className="text-muted-foreground">Daily target</span>
            <span className="font-medium">{state.plan.dailyCalorieTarget} kcal/day</span>
            <span className="text-muted-foreground">Macro targets</span>
            <span>
              {state.plan.macroTargets.proteinG}g protein · {state.plan.macroTargets.carbsG}g carbs ·{" "}
              {state.plan.macroTargets.fatG}g fat
            </span>
            {state.plan.realizedWeeklyRateKg !== 0 ? (
              <>
                <span className="text-muted-foreground">Estimated rate</span>
                <span>
                  {state.plan.realizedWeeklyRateKg > 0 ? "+" : ""}
                  {state.plan.realizedWeeklyRateKg} kg/week
                </span>
              </>
            ) : null}
          </div>
          {state.plan.flags.length > 0 ? (
            <div className="space-y-1 rounded-md border border-warning/30 bg-warning/5 p-2">
              {state.plan.flags.map((flag, i) => (
                <p key={i} className="flex gap-1.5 text-xs text-warning">
                  <TriangleAlert className="size-3.5 shrink-0 translate-y-0.5" />
                  {flag}
                </p>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Estimates from standard formulas, not medical advice — consult a qualified clinician for personalized
            guidance.
          </p>
        </div>
      ) : null}
    </div>
  );
}
