"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TODO_EVENT_COLOR } from "@/lib/calendar-constants";
import type { TodoCalendarEvent } from "@/lib/services/todo-service";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function TodoEventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: TodoCalendarEvent | null;
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
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: TODO_EVENT_COLOR }} />
                <DialogTitle>{event.title}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                {event.completed ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <Circle className="size-4 shrink-0" />
                )}
                {event.completed ? "Completed" : "Due"} {formatDate(event.date)}
              </p>
            </div>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/todos" />}>
              View todos
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
