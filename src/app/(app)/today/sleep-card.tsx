"use client";

import { useActionState, useState } from "react";
import { Moon, Trash2 } from "lucide-react";
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
import { formatMinutes } from "@/lib/format";
import type { SleepLog } from "@/lib/services/sleep-service";
import { deleteSleepLogAction, logSleepAction, type FormActionState } from "./actions";

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultBedtime() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(23, 0, 0, 0);
  return toDatetimeLocal(d);
}

function defaultWakeTime() {
  const d = new Date();
  d.setHours(7, 0, 0, 0);
  return toDatetimeLocal(d);
}

const initialState: FormActionState = { error: null };

export function SleepCard({ latest }: { latest: SleepLog | null }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(logSleepAction, initialState);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state !== initialState && !state.error) setOpen(false);
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Moon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Sleep</p>
          <p className="text-xs text-muted-foreground">
            {latest ? formatMinutes(latest.durationMinutes) : "Not logged yet"}
          </p>
        </div>
        {latest ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Delete sleep log"
            onClick={() => deleteSleepLogAction(latest.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
            Log
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Log sleep</DialogTitle>
              <DialogDescription>When did you go to bed and wake up?</DialogDescription>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sleepStart">Bedtime</Label>
                <Input
                  id="sleepStart"
                  name="sleepStart"
                  type="datetime-local"
                  defaultValue={defaultBedtime()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sleepEnd">Wake-up time</Label>
                <Input
                  id="sleepEnd"
                  name="sleepEnd"
                  type="datetime-local"
                  defaultValue={defaultWakeTime()}
                  required
                />
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
