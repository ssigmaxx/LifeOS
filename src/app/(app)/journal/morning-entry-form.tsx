"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { JournalEntry } from "@/lib/services/journal-service";
import { logMorningEntryAction, type FormActionState } from "./actions";
import { MoodPicker } from "./mood-picker";

const initialState: FormActionState = { error: null };

export function MorningEntryForm({
  entryDate,
  entry,
  onSaved,
}: {
  entryDate: string;
  entry: JournalEntry | null;
  onSaved?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(logMorningEntryAction, initialState);

  // onSaved updates a parent's state, so this must run as an effect rather
  // than during render (render-time updates may only touch this
  // component's own state — see EveningEntryForm for the same pattern).
  useEffect(() => {
    if (state !== initialState && !state.error) {
      onSaved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="entryDate" value={entryDate} />
      <div className="space-y-2">
        <Label>Mood</Label>
        <MoodPicker defaultValue={entry?.mood} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="intention">Today&apos;s intention</Label>
        <Input id="intention" name="intention" defaultValue={entry?.extra.intention ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="text">Journal</Label>
        <Textarea id="text" name="text" rows={4} defaultValue={entry?.text ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goals">Goals (optional)</Label>
        <Textarea id="goals" name="goals" rows={2} defaultValue={entry?.extra.goals ?? ""} />
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
  );
}
