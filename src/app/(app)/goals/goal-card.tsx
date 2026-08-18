"use client";

import { useState } from "react";
import { CheckCircle2, MoreVertical, Pencil, RotateCcw, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { FREQUENCY_LABELS, METRIC_LABELS, METRIC_UNITS } from "@/lib/goal-constants";
import type { Goal } from "@/lib/services/goal-service";
import { deleteGoalAction, setGoalStatusAction } from "./actions";
import { GoalFormDialog } from "./goal-form-dialog";

function formatDisplayValue(goal: Goal): string {
  const unit = METRIC_UNITS[goal.metricType];
  const value =
    goal.frequency === "average" ? goal.displayValue.toFixed(1) : Math.round(goal.displayValue);
  if (goal.frequency === "weekly") return `${value} / ${goal.targetValue} ${unit} this week`;
  if (goal.frequency === "average") return `${value} ${unit} average vs ${goal.targetValue} target`;
  return `${value} / ${goal.sampleSize} days hit ${goal.targetValue} ${unit}`;
}

export function GoalCard({ goal }: { goal: Goal }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const pct = Math.round(Math.min(goal.progressRatio, 1) * 100);

  return (
    <Card className={goal.status !== "active" ? "opacity-70" : undefined}>
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{goal.name}</span>
              <Badge variant="secondary">{METRIC_LABELS[goal.metricType]}</Badge>
              <Badge variant="outline">{FREQUENCY_LABELS[goal.frequency]}</Badge>
            </div>
            {goal.description ? (
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            ) : null}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Goal options" />}>
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              {goal.status === "active" ? (
                <>
                  <DropdownMenuItem onClick={() => setGoalStatusAction(goal.id, "completed")}>
                    <CheckCircle2 className="size-4" /> Mark complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGoalStatusAction(goal.id, "abandoned")}>
                    <XCircle className="size-4" /> Abandon
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => setGoalStatusAction(goal.id, "active")}>
                  <RotateCcw className="size-4" /> Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Progress value={pct} />
        <p className="text-xs text-muted-foreground">
          {goal.sampleSize === 0 ? "No data yet" : formatDisplayValue(goal)} · {pct}%
        </p>
      </CardContent>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{goal.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setDeleteOpen(false);
                deleteGoalAction(goal.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GoalFormDialog goal={goal} open={editOpen} onOpenChange={setEditOpen} />
    </Card>
  );
}
