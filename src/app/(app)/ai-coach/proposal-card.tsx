"use client";

import { useState } from "react";
import { Apple, Check, ListChecks, Target, TriangleAlert, UtensilsCrossed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WEEKDAY_LABELS, TRACKING_TYPE_LABELS } from "@/lib/habit-constants";
import { METRIC_LABELS, FREQUENCY_LABELS } from "@/lib/goal-constants";
import type { Proposal } from "@/lib/ai/types";
import {
  confirmGoalProposalAction,
  confirmHabitProposalAction,
  confirmMealLogAction,
  confirmNutritionProfileAction,
} from "./actions";

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  active: "Active",
  very_active: "Very active",
};

const DONE_LABELS: Record<Proposal["kind"], string> = {
  habit: "Habit created",
  goal: "Goal created",
  nutrition_profile: "Calorie target saved",
  meal_log: "Meal logged",
};

const DRAFT_LABELS: Record<Proposal["kind"], string> = {
  habit: "Gemini wants to create a habit",
  goal: "Gemini wants to create a goal",
  nutrition_profile: "Gemini computed a calorie target",
  meal_log: "Gemini wants to log a meal",
};

const KIND_ICONS: Record<Proposal["kind"], typeof ListChecks> = {
  habit: ListChecks,
  goal: Target,
  nutrition_profile: Apple,
  meal_log: UtensilsCrossed,
};

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [status, setStatus] = useState<"pending" | "saving" | "done" | "dismissed">("pending");
  const [error, setError] = useState<string | null>(null);

  if (status === "dismissed") return null;

  async function confirm() {
    setStatus("saving");
    const result =
      proposal.kind === "habit"
        ? await confirmHabitProposalAction(proposal)
        : proposal.kind === "goal"
          ? await confirmGoalProposalAction(proposal)
          : proposal.kind === "nutrition_profile"
            ? await confirmNutritionProfileAction(proposal)
            : await confirmMealLogAction(proposal);
    if (result.error) {
      setError(result.error);
      setStatus("pending");
    } else {
      setStatus("done");
    }
  }

  const Icon = KIND_ICONS[proposal.kind];

  if (status === "done") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-2 py-3 text-sm">
          <Check className="size-4 text-primary" />
          {DONE_LABELS[proposal.kind]}
          {proposal.kind === "habit" || proposal.kind === "goal" ? ` — "${proposal.name}"` : null}
          {proposal.kind === "meal_log" ? ` — "${proposal.foodName}"` : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {DRAFT_LABELS[proposal.kind]}
        </div>

        {proposal.kind === "habit" ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">{proposal.name}</p>
            {proposal.description ? <p className="text-muted-foreground">{proposal.description}</p> : null}
            <p className="text-xs text-muted-foreground">
              {TRACKING_TYPE_LABELS[proposal.trackingType]}
              {proposal.targetValue ? ` · target ${proposal.targetValue}${proposal.unit ? ` ${proposal.unit}` : ""}` : ""}
              {" · "}
              {proposal.frequency === "daily"
                ? "Every day"
                : proposal.weekdays?.map((d) => WEEKDAY_LABELS[d]).join(", ")}
            </p>
          </div>
        ) : null}

        {proposal.kind === "goal" ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">{proposal.name}</p>
            {proposal.description ? <p className="text-muted-foreground">{proposal.description}</p> : null}
            <p className="text-xs text-muted-foreground">
              {METRIC_LABELS[proposal.metricType]} · target {proposal.targetValue} · {FREQUENCY_LABELS[proposal.frequency]}
            </p>
          </div>
        ) : null}

        {proposal.kind === "nutrition_profile" ? (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">BMI</span>
              <span>
                {proposal.bmi} ({proposal.bmiCategory.replace("_", " ")})
              </span>
              <span className="text-muted-foreground">Maintenance (TDEE)</span>
              <span>{proposal.tdee} kcal/day</span>
              <span className="text-muted-foreground">Daily target</span>
              <span className="font-medium">{proposal.dailyCalorieTarget} kcal/day</span>
              <span className="text-muted-foreground">Macros</span>
              <span>
                {proposal.proteinTargetG}g protein · {proposal.carbsTargetG}g carbs · {proposal.fatTargetG}g fat
              </span>
              <span className="text-muted-foreground">Activity</span>
              <span>{ACTIVITY_LABELS[proposal.activityLevel]}</span>
            </div>
            {proposal.flags.length > 0 ? (
              <div className="space-y-1 rounded-md border border-warning/30 bg-warning/5 p-2">
                {proposal.flags.map((flag, i) => (
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

        {proposal.kind === "meal_log" ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              {proposal.foodName} · {proposal.quantityGrams}g
            </p>
            <p className="text-xs text-muted-foreground">
              {MEAL_TYPE_LABELS[proposal.mealType]} · {proposal.calories} kcal · {proposal.proteinG}g protein ·{" "}
              {proposal.carbsG}g carbs · {proposal.fatG}g fat
            </p>
            {proposal.isEstimate ? (
              <p className="flex items-center gap-1 text-xs text-warning">
                <TriangleAlert className="size-3.5" /> Estimated — no exact database match found.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Source: Open Food Facts</p>
            )}
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          <Button size="sm" disabled={status === "saving"} onClick={confirm}>
            <Check className="size-4" /> {status === "saving" ? "Saving…" : "Confirm"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStatus("dismissed")}>
            <X className="size-4" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
