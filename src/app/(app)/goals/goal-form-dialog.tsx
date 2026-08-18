"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FREQUENCY_HINTS,
  FREQUENCY_LABELS,
  METRIC_DEFAULT_FREQUENCY,
  METRIC_LABELS,
  METRIC_UNITS,
} from "@/lib/goal-constants";
import type { GoalFrequency } from "@/lib/goal-progress";
import type { Goal, GoalMetricType } from "@/lib/services/goal-service";
import { createGoalAction, updateGoalAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

export function GoalFormDialog({
  trigger,
  goal,
  open: openProp,
  onOpenChange,
}: {
  trigger?: ReactNode;
  goal?: Goal;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const action = goal ? updateGoalAction.bind(null, goal.id) : createGoalAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [metricType, setMetricType] = useState<GoalMetricType>(
    goal?.metricType ?? "water_ml",
  );
  const [frequency, setFrequency] = useState<GoalFrequency>(
    goal?.frequency ?? METRIC_DEFAULT_FREQUENCY["water_ml"],
  );

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state !== initialState && !state.error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger as React.ReactElement} /> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>
            {goal ? "Update this goal." : "Set a target for something you're already tracking."}
          </DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            formData.set("metricType", metricType);
            formData.set("frequency", frequency);
            formAction(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={goal?.name} required maxLength={100} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={goal?.description ?? ""}
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metricType">Metric</Label>
            <Select
              value={metricType}
              onValueChange={(v) => {
                const next = v as GoalMetricType;
                setMetricType(next);
                if (!goal) setFrequency(METRIC_DEFAULT_FREQUENCY[next]);
              }}
            >
              <SelectTrigger id="metricType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METRIC_LABELS) as GoalMetricType[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {METRIC_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetValue">Target ({METRIC_UNITS[metricType]})</Label>
              <Input
                id="targetValue"
                name="targetValue"
                type="number"
                step="any"
                min={0}
                defaultValue={goal?.targetValue}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as GoalFrequency)}>
                <SelectTrigger id="frequency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABELS) as GoalFrequency[]).map((f) => (
                    <SelectItem key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{FREQUENCY_HINTS[frequency]}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={goal?.startDate ?? new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date (optional)</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={goal?.endDate ?? ""} />
            </div>
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : goal ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
