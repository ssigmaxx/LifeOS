"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Upload } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CALENDAR_COLOR_PALETTE } from "@/lib/calendar-constants";
import type { Calendar } from "@/lib/services/calendar-service";
import { importIcsAction, type ImportIcsState } from "./actions";

const initialState: ImportIcsState = { error: null, importedCount: null };

export function IcsImportDialog({ trigger, calendars }: { trigger: ReactNode; calendars: Calendar[] }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(calendars[0]?.id ?? "__new__");
  const [newColor, setNewColor] = useState<string>(CALENDAR_COLOR_PALETTE[0]);
  const [state, formAction, isPending] = useActionState(importIcsAction, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import .ics file</DialogTitle>
          <DialogDescription>
            Imports events from a calendar export. Weekly-recurring events are supported; other
            recurrence rules import as a single occurrence.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">.ics file</Label>
            <Input id="file" name="file" type="file" accept=".ics,text/calendar" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="calendarId">Add to</Label>
            <Select value={target} onValueChange={(v) => setTarget(v ?? "__new__")}>
              <SelectTrigger id="calendarId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {calendars.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value="__new__">New calendar…</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="calendarId" value={target} />
          </div>

          {target === "__new__" ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label htmlFor="newCalendarName">Calendar name</Label>
                <Input id="newCalendarName" name="newCalendarName" maxLength={100} required />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {CALENDAR_COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      aria-label={color}
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform",
                        newColor === color ? "scale-110 border-foreground" : "border-transparent",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input type="hidden" name="newCalendarColor" value={newColor} />
              </div>
            </div>
          ) : null}

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          {state.importedCount != null ? (
            <p className="text-sm text-muted-foreground">
              Imported {state.importedCount} event{state.importedCount === 1 ? "" : "s"}.
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Upload className="size-4" /> {isPending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
