"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, MoreVertical, Pencil, Plus, RotateCcw, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import type { Goal } from "@/lib/services/goal-service";
import {
  addMilestoneAction,
  deleteGoalAction,
  deleteMilestoneAction,
  setGoalStatusAction,
  toggleMilestoneAction,
  type FormActionState,
} from "./actions";
import { GoalFormDialog } from "./goal-form-dialog";

const initialState: FormActionState = { error: null };

function formatTargetDate(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function AddMilestoneForm({ goalId }: { goalId: string }) {
  const action = addMilestoneAction.bind(null, goalId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <Input name="title" placeholder="Add a milestone…" required maxLength={200} className="h-8 flex-1 text-sm" />
      <Button type="submit" size="icon-sm" variant="ghost" disabled={isPending} aria-label="Add milestone">
        <Plus className="size-4" />
      </Button>
      {state.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function MilestoneRow({ milestone }: { milestone: Goal["milestones"][number] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="group flex items-center gap-2 py-1">
      <Checkbox
        checked={milestone.completed}
        disabled={isPending}
        onCheckedChange={(checked) =>
          startTransition(() => toggleMilestoneAction(milestone.id, checked === true))
        }
      />
      <span
        className={cn(
          "flex-1 truncate text-sm",
          milestone.completed && "text-muted-foreground line-through",
        )}
      >
        {milestone.title}
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100"
        aria-label={`Delete ${milestone.title}`}
        onClick={() => startTransition(() => deleteMilestoneAction(milestone.id))}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function GoalCard({ goal }: { goal: Goal }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const pct = Math.round(goal.progressRatio * 100);

  return (
    <Card className={goal.status !== "active" ? "opacity-70" : undefined}>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{goal.name}</span>
              {goal.targetDate ? <Badge variant="outline">by {formatTargetDate(goal.targetDate)}</Badge> : null}
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

        <div className="space-y-1">
          <Progress value={pct} />
          <p className="text-xs text-muted-foreground">
            {goal.milestonesTotal === 0
              ? "No milestones yet"
              : `${goal.milestonesCompleted} / ${goal.milestonesTotal} milestones · ${pct}%`}
          </p>
        </div>

        <div className="space-y-0.5 border-t pt-2">
          {goal.milestones.map((m) => (
            <MilestoneRow key={m.id} milestone={m} />
          ))}
          <AddMilestoneForm goalId={goal.id} />
        </div>
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
              variant="destructive-solid"
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
