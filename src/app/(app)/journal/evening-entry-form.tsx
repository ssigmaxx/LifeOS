"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { JournalEntry } from "@/lib/services/journal-service";
import { logEveningEntryAction, type FormActionState } from "./actions";
import { MoodPicker } from "./mood-picker";

const initialState: FormActionState = { error: null };

export function EveningEntryForm({
  entryDate,
  entry,
  onSaved,
}: {
  entryDate: string;
  entry: JournalEntry | null;
  onSaved?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(logEveningEntryAction, initialState);

  // onSaved updates a parent's state, so this must run as an effect rather
  // than during render — see MorningEntryForm for the same pattern.
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
        <Label htmlFor="text">Journal</Label>
        <Textarea id="text" name="text" rows={4} defaultValue={entry?.text ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wentWell">What went well?</Label>
        <Textarea id="wentWell" name="wentWell" rows={2} defaultValue={entry?.extra.wentWell ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="couldImprove">What could be improved?</Label>
        <Textarea
          id="couldImprove"
          name="couldImprove"
          rows={2}
          defaultValue={entry?.extra.couldImprove ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gratitude">Gratitude</Label>
        <Textarea id="gratitude" name="gratitude" rows={2} defaultValue={entry?.extra.gratitude ?? ""} />
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
