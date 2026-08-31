"use client";

import { useEffect, useState, useTransition } from "react";
import { Clock, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CalendarEvent } from "@/lib/services/calendar-service";
import { countEventsInSeriesAction, deleteEventAction, deleteEventSeriesAction } from "./actions";

function formatClockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatWhen(event: CalendarEvent) {
  if (event.isAllDay) return "All day";
  const start = formatClockTime(event.startAt);
  return event.endAt ? `${start} – ${formatClockTime(event.endAt)}` : start;
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  // Keyed by groupId so a stale count from a previously-viewed event can
  // never leak onto a different one without an extra setState-on-mount.
  const [seriesCount, setSeriesCount] = useState<{ groupId: string; count: number } | null>(null);

  useEffect(() => {
    if (!event?.recurrenceGroupId) return;
    const groupId = event.recurrenceGroupId;
    let cancelled = false;
    countEventsInSeriesAction(groupId).then((count) => {
      if (!cancelled) setSeriesCount({ groupId, count });
    });
    return () => {
      cancelled = true;
    };
  }, [event?.recurrenceGroupId]);

  const currentSeriesCount =
    event?.recurrenceGroupId && seriesCount?.groupId === event.recurrenceGroupId ? seriesCount.count : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {event ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: event.calendarColor }} />
                <DialogTitle>{event.title}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">{event.calendarName}</p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4 shrink-0" /> {formatWhen(event)}
              </p>
              {event.location ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" /> {event.location}
                </p>
              ) : null}
              {event.description ? <p className="whitespace-pre-line">{event.description}</p> : null}
            </div>

            {event.recurrenceGroupId && currentSeriesCount != null && currentSeriesCount > 1 ? (
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="destructive-solid"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteEventAction(event.id);
                      onOpenChange(false);
                    })
                  }
                >
                  <Trash2 className="size-4" /> Delete this event
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteEventSeriesAction(event.recurrenceGroupId!);
                      onOpenChange(false);
                    })
                  }
                >
                  <Trash2 className="size-4" /> Delete all {currentSeriesCount} events in this series
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="destructive-solid"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteEventAction(event.id);
                    onOpenChange(false);
                  })
                }
              >
                <Trash2 className="size-4" /> Delete event
              </Button>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
