"use client";

import Link from "next/link";
import { CheckCircle2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GOAL_EVENT_COLOR } from "@/lib/calendar-constants";
import type { GoalCalendarEvent } from "@/lib/services/goal-service";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function GoalEventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: GoalCalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {event ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: GOAL_EVENT_COLOR }} />
                <DialogTitle>{event.kind === "milestone" ? event.title : `${event.title} — target date`}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                {event.kind === "milestone" ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <Target className="size-4 shrink-0" />
                )}
                {event.kind === "milestone" ? `Completed ${formatDate(event.date)}` : formatDate(event.date)}
              </p>
              {event.kind === "milestone" ? (
                <p className="text-xs text-muted-foreground">Milestone on &ldquo;{event.goalName}&rdquo;</p>
              ) : null}
            </div>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/goals" />}>
              View goal
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
