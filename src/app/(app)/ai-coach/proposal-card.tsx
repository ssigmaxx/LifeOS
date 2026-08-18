"use client";

import { useState } from "react";
import { Check, ListChecks, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WEEKDAY_LABELS, TRACKING_TYPE_LABELS } from "@/lib/habit-constants";
import { METRIC_LABELS, FREQUENCY_LABELS } from "@/lib/goal-constants";
import type { Proposal } from "@/lib/ai/types";
import { confirmGoalProposalAction, confirmHabitProposalAction } from "./actions";

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [status, setStatus] = useState<"pending" | "saving" | "done" | "dismissed">("pending");
  const [error, setError] = useState<string | null>(null);

  if (status === "dismissed") return null;

  async function confirm() {
    setStatus("saving");
    const result =
      proposal.kind === "habit"
        ? await confirmHabitProposalAction(proposal)
        : await confirmGoalProposalAction(proposal);
    if (result.error) {
      setError(result.error);
      setStatus("pending");
    } else {
      setStatus("done");
    }
  }

  if (status === "done") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-2 py-3 text-sm">
          <Check className="size-4 text-primary" />
          {proposal.kind === "habit" ? "Habit" : "Goal"} created — &quot;{proposal.name}&quot;
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {proposal.kind === "habit" ? (
            <ListChecks className="size-4 text-muted-foreground" />
          ) : (
            <Target className="size-4 text-muted-foreground" />
          )}
          Gemini wants to create a {proposal.kind}
        </div>

        <div className="space-y-1 text-sm">
          <p className="font-medium">{proposal.name}</p>
          {proposal.description ? (
            <p className="text-muted-foreground">{proposal.description}</p>
          ) : null}
          {proposal.kind === "habit" ? (
            <p className="text-xs text-muted-foreground">
              {TRACKING_TYPE_LABELS[proposal.trackingType]}
              {proposal.targetValue ? ` · target ${proposal.targetValue}${proposal.unit ? ` ${proposal.unit}` : ""}` : ""}
              {" · "}
              {proposal.frequency === "daily"
                ? "Every day"
                : proposal.weekdays?.map((d) => WEEKDAY_LABELS[d]).join(", ")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {METRIC_LABELS[proposal.metricType]} · target {proposal.targetValue} ·{" "}
              {FREQUENCY_LABELS[proposal.frequency]}
            </p>
          )}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          <Button size="sm" disabled={status === "saving"} onClick={confirm}>
            <Check className="size-4" /> {status === "saving" ? "Creating…" : `Create ${proposal.kind}`}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStatus("dismissed")}>
            <X className="size-4" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
