"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS, TRACKING_TYPE_LABELS, TRACKING_TYPE_HINTS } from "@/lib/habit-constants";
import type { TrackingType } from "@/lib/habit-completion";
import type { Habit, HabitCategory } from "@/lib/services/habit-service";
import { createHabitAction, updateHabitAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

export function HabitFormDialog({
  trigger,
  habit,
  categories,
  open: openProp,
  onOpenChange,
}: {
  trigger?: ReactNode;
  habit?: Habit;
  categories: HabitCategory[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const action = habit ? updateHabitAction.bind(null, habit.id) : createHabitAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [trackingType, setTrackingType] = useState<TrackingType>(
    habit?.trackingType ?? "boolean",
  );
  const [frequency, setFrequency] = useState<"daily" | "custom">(
    habit && habit.scheduleWeekdays.length > 0 ? "custom" : "daily",
  );
  const [weekdays, setWeekdays] = useState<number[]>(habit?.scheduleWeekdays ?? []);

  // Close the dialog once a submission succeeds. `setOpen` may be a parent's
  // setter (controlled usage from HabitCard's edit menu), so this has to
  // run as an effect — updating another component's state during render
  // throws "Cannot update a component while rendering a different component".
  useEffect(() => {
    if (state !== initialState && !state.error) {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  const needsUnit = trackingType === "numeric" || trackingType === "counter";
  const needsTarget = trackingType !== "boolean";
  const targetLabel = trackingType === "duration" ? "Target (minutes)" : trackingType === "time" ? "Target (latest by)" : "Target";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      {trigger ? <DialogTrigger render={trigger as React.ReactElement} /> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{habit ? "Edit habit" : "New habit"}</DialogTitle>
          <DialogDescription>
            {habit ? "Update how this habit is tracked." : "Habits can be tracked daily or on specific days."}
          </DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            formData.set("trackingType", trackingType);
            formData.set("frequency", frequency);
            formAction(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={habit?.name} required maxLength={100} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={habit?.description ?? ""}
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select name="categoryId" defaultValue={habit?.categoryId ?? ""}>
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icon (emoji)</Label>
              <Input id="icon" name="icon" defaultValue={habit?.icon ?? ""} maxLength={4} placeholder="🏋️" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackingType">Tracking type</Label>
            <Select value={trackingType} onValueChange={(v) => setTrackingType(v as TrackingType)}>
              <SelectTrigger id="trackingType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TRACKING_TYPE_LABELS) as TrackingType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRACKING_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{TRACKING_TYPE_HINTS[trackingType]}</p>
          </div>

          {(needsUnit || needsTarget) && (
            <div className="grid grid-cols-2 gap-4">
              {needsUnit && (
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" name="unit" defaultValue={habit?.unit ?? ""} placeholder="L, reps…" maxLength={20} />
                </div>
              )}
              {needsTarget && (
                <div className="space-y-2">
                  <Label htmlFor="targetValue">{targetLabel}</Label>
                  <Input
                    id="targetValue"
                    name="targetValue"
                    type="number"
                    step="any"
                    min={0}
                    defaultValue={habit?.targetValue ?? ""}
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={habit?.startDate ?? new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scoreWeight">Score weight</Label>
              <Input
                id="scoreWeight"
                name="scoreWeight"
                type="number"
                step="any"
                min={0}
                defaultValue={habit?.scoreWeight ?? 1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={frequency === "daily" ? "default" : "outline"}
                onClick={() => setFrequency("daily")}
              >
                Every day
              </Button>
              <Button
                type="button"
                size="sm"
                variant={frequency === "custom" ? "default" : "outline"}
                onClick={() => setFrequency("custom")}
              >
                Specific days
              </Button>
            </div>
            {frequency === "custom" && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    className={cn(
                      "size-9 rounded-full border text-xs font-medium transition-colors",
                      weekdays.includes(day)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:bg-accent",
                    )}
                  >
                    {label[0]}
                  </button>
                ))}
                {weekdays.map((day) => (
                  <input key={day} type="hidden" name="weekdays" value={day} />
                ))}
              </div>
            )}
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : habit ? "Save changes" : "Create habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
