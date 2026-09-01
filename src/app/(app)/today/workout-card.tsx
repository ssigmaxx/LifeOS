"use client";

import { useActionState, useState } from "react";
import { Check, Dumbbell, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconBadge } from "@/components/icon-badge";
import { formatMinutes } from "@/lib/format";
import type { TodayWorkout } from "@/lib/services/workout-service";
import {
  clearTodayWorkoutAction,
  logWorkoutAction,
  type FormActionState,
} from "./actions";

const initialState: FormActionState = { error: null };

export function WorkoutCard({ workout }: { workout: TodayWorkout }) {
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(logWorkoutAction, initialState);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state !== initialState && !state.error) setOpen(false);
  }

  const summary = workout
    ? [workout.workoutType, workout.durationMinutes ? formatMinutes(workout.durationMinutes) : null]
        .filter(Boolean)
        .join(" · ") || "Done"
    : "Not logged yet";

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <IconBadge icon={Dumbbell} tone="rose" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Gym</p>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>

        {workout ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Undo workout"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await clearTodayWorkoutAction();
              setPending(false);
            }}
          >
            <Undo2 className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Mark workout done"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await logWorkoutAction(initialState, new FormData());
              setPending(false);
            }}
          >
            <Check className="size-4" />
          </Button>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
            Details
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Workout details</DialogTitle>
              <DialogDescription>Optional — type, duration, notes.</DialogDescription>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workoutType">Type</Label>
                <Input
                  id="workoutType"
                  name="workoutType"
                  defaultValue={workout?.workoutType ?? ""}
                  placeholder="Strength, run, yoga…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                <Input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  min={1}
                  defaultValue={workout?.durationMinutes ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Input id="note" name="note" defaultValue={workout?.note ?? ""} />
              </div>
              {state.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {state.error}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
