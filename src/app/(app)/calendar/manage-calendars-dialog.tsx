"use client";

import { useActionState, useState, useTransition } from "react";
import { GitMerge, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { DEFAULT_CALENDAR_COLOR } from "@/lib/calendar-constants";
import type { Calendar } from "@/lib/services/calendar-service";
import { createCalendarAction, deleteCalendarAction, mergeCalendarsAction, type FormActionState } from "./actions";
import { ColorSwatchPicker } from "./color-swatch-picker";

const initialCreateState: FormActionState = { error: null };

function NewCalendarForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CALENDAR_COLOR);
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormActionState, formData: FormData) => {
      const result = await createCalendarAction(Object.fromEntries(formData));
      if (!result.error) {
        setOpen(false);
        setName("");
        setColor(DEFAULT_CALENDAR_COLOR);
      }
      return result;
    },
    initialCreateState,
  );

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New calendar
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border p-3">
      <div className="space-y-2">
        <Label htmlFor="newCalendarName">Name</Label>
        <Input
          id="newCalendarName"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Uni schedule"
          maxLength={100}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Color</Label>
        <ColorSwatchPicker value={color} onChange={setColor} />
        <input type="hidden" name="color" value={color} />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Creating…" : "Create"}
        </Button>
      </div>
    </form>
  );
}

function CalendarRow({ calendar, others }: { calendar: Calendar; others: Calendar[] }) {
  const [targetId, setTargetId] = useState<string>(others[0]?.id ?? "");
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const target = others.find((c) => c.id === targetId) ?? null;

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: calendar.color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{calendar.name}</p>
        <p className="text-xs text-muted-foreground">
          {calendar.eventCount} event{calendar.eventCount === 1 ? "" : "s"}
        </p>
      </div>

      {others.length > 0 ? (
        <>
          <Select value={targetId} onValueChange={(v) => setTargetId(v ?? "")}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {others.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!target || isPending}
            onClick={() => setMergeConfirmOpen(true)}
          >
            <GitMerge className="size-4" /> Merge in
          </Button>
        </>
      ) : null}

      <Button
        size="icon"
        variant="ghost"
        aria-label={`Delete ${calendar.name}`}
        disabled={isPending}
        onClick={() => setDeleteConfirmOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <AlertDialog open={mergeConfirmOpen} onOpenChange={setMergeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Merge &quot;{calendar.name}&quot; into &quot;{target?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All {calendar.eventCount} event{calendar.eventCount === 1 ? "" : "s"} move to &quot;{target?.name}
              &quot; and &quot;{calendar.name}&quot; is deleted. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              onClick={() => {
                setMergeConfirmOpen(false);
                if (target) {
                  startTransition(async () => {
                    await mergeCalendarsAction({ sourceId: calendar.id, targetId: target.id });
                  });
                }
              }}
            >
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{calendar.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {calendar.eventCount > 0
                ? `This deletes the calendar and all ${calendar.eventCount} event${calendar.eventCount === 1 ? "" : "s"} in it. This can't be undone — merge into another calendar instead if you want to keep the events.`
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              onClick={() => {
                setDeleteConfirmOpen(false);
                startTransition(async () => {
                  await deleteCalendarAction(calendar.id);
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ManageCalendarsDialog({
  calendars,
  open,
  onOpenChange,
}: {
  calendars: Calendar[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Calendars</DialogTitle>
          <DialogDescription>
            {calendars.length > 1
              ? "Merge one calendar into another to consolidate events, or delete one outright."
              : "Events you create or import are organized into calendars."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <NewCalendarForm />
          <div className="divide-y">
            {calendars.map((calendar) => (
              <CalendarRow
                key={calendar.id}
                calendar={calendar}
                others={calendars.filter((c) => c.id !== calendar.id)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
