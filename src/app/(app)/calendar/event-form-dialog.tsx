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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Calendar } from "@/lib/services/calendar-service";
import { createEventAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

// "YYYY-MM-DDTHH:MM" for a datetime-local input's defaultValue, or
// "YYYY-MM-DD" for a date input when isAllDay.
function toInputValue(iso: string, isAllDay: boolean): string {
  return isAllDay ? iso.slice(0, 10) : iso.slice(0, 16);
}

export function EventFormDialog({
  trigger,
  calendars,
  open: openProp,
  onOpenChange,
  defaultStartAt,
  defaultEndAt,
  defaultIsAllDay = false,
}: {
  trigger?: ReactNode;
  calendars: Calendar[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultStartAt?: string;
  defaultEndAt?: string;
  defaultIsAllDay?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [calendarId, setCalendarId] = useState(calendars[0]?.id ?? "");
  const [isAllDay, setIsAllDay] = useState(defaultIsAllDay);
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormActionState, formData: FormData) => {
      const result = await createEventAction(Object.fromEntries(formData));
      if (!result.error) setOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger as React.ReactElement} /> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
          <DialogDescription>Add something to your calendar.</DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            formData.set("calendarId", calendarId);
            formData.set("isAllDay", String(isAllDay));
            formAction(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required maxLength={200} />
          </div>

          {calendars.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="calendarId">Calendar</Label>
              <Select value={calendarId} onValueChange={(v) => setCalendarId(v ?? "")}>
                <SelectTrigger id="calendarId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <Label htmlFor="isAllDay">All day</Label>
            <Switch id="isAllDay" checked={isAllDay} onCheckedChange={setIsAllDay} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startAt">Start</Label>
              <Input
                id="startAt"
                name="startAt"
                type={isAllDay ? "date" : "datetime-local"}
                defaultValue={defaultStartAt ? toInputValue(defaultStartAt, isAllDay) : undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endAt">End (optional)</Label>
              <Input
                id="endAt"
                name="endAt"
                type={isAllDay ? "date" : "datetime-local"}
                defaultValue={defaultEndAt ? toInputValue(defaultEndAt, isAllDay) : undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" maxLength={200} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} maxLength={1000} />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
