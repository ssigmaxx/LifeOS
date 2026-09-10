"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CYCLE_SYMPTOMS, MOOD_LABELS, PAIN_LABELS } from "@/lib/cycle-constants";
import type { CycleLog } from "@/lib/services/cycle-service";
import { runAction } from "@/lib/toast-action";
import { deleteCycleLogAction, saveCycleLogAction, type FormActionState } from "./actions";

const PERIOD_FLOW_LABELS: Record<string, string> = {
  none: "None today",
  spotting: "Spotting",
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

const initialState: FormActionState = { error: null };

export function CycleLogForm({ date, log }: { date: string; log: CycleLog | null }) {
  const action = saveCycleLogAction.bind(null, date);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [pillTaken, setPillTaken] = useState(log?.pillTaken ?? false);
  const [symptoms, setSymptoms] = useState<string[]>(log?.symptoms ?? []);

  useEffect(() => {
    if (state !== initialState && !state.error) toast.success("Saved.");
  }, [state]);

  function toggleSymptom(symptom: string) {
    setSymptoms((prev) => (prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]));
  }

  const hasEntry =
    log !== null &&
    (log.periodFlow != null ||
      log.pillTaken != null ||
      log.mood != null ||
      log.painLevel != null ||
      log.symptoms.length > 0 ||
      (log.note?.length ?? 0) > 0);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodFlow">Period flow</Label>
              <Select name="periodFlow" defaultValue={log?.periodFlow ?? "none"}>
                <SelectTrigger id="periodFlow" className="w-full">
                  <SelectValue>{(value: string) => PERIOD_FLOW_LABELS[value] ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None today</SelectItem>
                  <SelectItem value="spotting">Spotting</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="heavy">Heavy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pill-taken">Birth control</Label>
              <div className="flex h-8 items-center gap-2">
                <Checkbox id="pill-taken" checked={pillTaken} onCheckedChange={(c) => setPillTaken(c === true)} />
                <Label htmlFor="pill-taken" className="text-sm font-normal">
                  Took the pill today
                </Label>
                <input type="hidden" name="pillTaken" value={String(pillTaken)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mood">Mood</Label>
              <Select name="mood" defaultValue={log?.mood != null ? String(log.mood) : undefined}>
                <SelectTrigger id="mood" className="w-full">
                  <SelectValue placeholder="Not logged">
                    {(value: string) => MOOD_LABELS[Number(value)] ?? "Not logged"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MOOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="painLevel">Pain</Label>
              <Select name="painLevel" defaultValue={log?.painLevel != null ? String(log.painLevel) : undefined}>
                <SelectTrigger id="painLevel" className="w-full">
                  <SelectValue placeholder="Not logged">
                    {(value: string) => PAIN_LABELS[Number(value)] ?? "Not logged"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAIN_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Symptoms</Label>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
              {CYCLE_SYMPTOMS.map((symptom) => (
                <div key={symptom} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={symptoms.includes(symptom)} onCheckedChange={() => toggleSymptom(symptom)} />
                  {symptom}
                </div>
              ))}
            </div>
            {symptoms.map((s) => (
              <input key={s} type="hidden" name="symptoms" value={s} />
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Anything else</Label>
            <Textarea
              id="note"
              name="note"
              defaultValue={log?.note ?? ""}
              maxLength={500}
              rows={2}
              placeholder="Notes, other symptoms, whatever's useful to remember…"
            />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            {hasEntry ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void runAction(deleteCycleLogAction(date), {
                    success: "Entry cleared.",
                    error: "Failed to clear entry.",
                  })
                }
              >
                Clear entry
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
