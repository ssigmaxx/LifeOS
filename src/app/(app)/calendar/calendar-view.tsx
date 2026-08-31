"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  DateSelectInfo,
  EventApi,
  EventClickInfo,
  EventDropInfo,
  EventInput,
  EventResizeDoneInfo,
  EventSourceFuncInfo,
} from "@fullcalendar/react";
import { EventCalendar } from "@/registry/components/event-calendar";
import type { Calendar, CalendarEvent } from "@/lib/services/calendar-service";
import type { GoalCalendarEvent } from "@/lib/services/goal-service";
import { GOAL_EVENT_COLOR } from "@/lib/calendar-constants";
import { updateEventTimesAction } from "./actions";
import { EventFormDialog } from "./event-form-dialog";
import { EventDetailDialog } from "./event-detail-dialog";
import { GoalEventDialog } from "./goal-event-dialog";

function toEventInput(event: CalendarEvent): EventInput {
  return {
    id: event.id,
    title: event.title,
    start: event.startAt,
    end: event.endAt ?? undefined,
    allDay: event.isAllDay,
    color: event.calendarColor,
    extendedProps: {
      calendarId: event.calendarId,
      calendarColor: event.calendarColor,
      calendarName: event.calendarName,
      location: event.location,
      description: event.description,
      recurrenceGroupId: event.recurrenceGroupId,
    },
  };
}

function toGoalEventInput(event: GoalCalendarEvent): EventInput {
  return {
    id: `goal-${event.kind}-${event.id}`,
    title: event.kind === "milestone" ? `✓ ${event.title}` : `🎯 ${event.title}`,
    start: event.date,
    allDay: true,
    editable: false,
    color: GOAL_EVENT_COLOR,
    extendedProps: { source: "goal", goalEvent: event },
  };
}

function fromEventApi(event: EventApi): CalendarEvent {
  const props = event.extendedProps as {
    calendarId: string;
    calendarColor: string;
    calendarName: string;
    location: string | null;
    description: string | null;
    recurrenceGroupId: string | null;
  };
  return {
    id: event.id,
    title: event.title,
    startAt: (event.start ?? new Date()).toISOString(),
    endAt: event.end ? event.end.toISOString() : null,
    isAllDay: event.allDay,
    calendarId: props.calendarId,
    calendarColor: props.calendarColor,
    calendarName: props.calendarName,
    location: props.location,
    description: props.description,
    recurrenceGroupId: props.recurrenceGroupId,
  };
}

async function persistTimeChange(id: string, start: Date, end: Date | null, revert: () => void) {
  try {
    await updateEventTimesAction(id, start.toISOString(), end ? end.toISOString() : null);
  } catch {
    revert();
  }
}

export function CalendarView({ calendars }: { calendars: Calendar[] }) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedGoalEvent, setSelectedGoalEvent] = useState<GoalCalendarEvent | null>(null);
  const [goalDetailOpen, setGoalDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<string | undefined>(undefined);
  const [draftEnd, setDraftEnd] = useState<string | undefined>(undefined);
  const [draftAllDay, setDraftAllDay] = useState(false);

  // A plain fetch to Route Handlers, not Server Actions — FullCalendar
  // invokes this itself during its own mount lifecycle, and Next.js
  // forbids calling a Server Action during a Client Component's initial
  // render (see src/app/api/calendar/events/route.ts for the full story).
  // Also wrapped in useCallback: FullCalendar treats a new `events`
  // function reference as "the source changed" and refetches, so an
  // inline arrow function here would refetch on every render.
  const events = useCallback(async (info: EventSourceFuncInfo) => {
    // Node's fetch (unlike a browser's) can't resolve a relative URL, and
    // this callback can fire once during the server-executed initial
    // render pass of this "use client" tree before hydration — skip that
    // pass and let FullCalendar's real client-side call (which does have
    // a browser location to resolve against) fetch the actual data.
    if (typeof window === "undefined") return [];

    const params = new URLSearchParams({ start: info.startStr, end: info.endStr });
    const [eventsResponse, goalEventsResponse] = await Promise.all([
      fetch(`/api/calendar/events?${params}`),
      fetch(`/api/calendar/goal-events?${params}`),
    ]);
    if (!eventsResponse.ok) throw new Error("Failed to load events");
    const events: CalendarEvent[] = await eventsResponse.json();
    const goalEvents: GoalCalendarEvent[] = goalEventsResponse.ok ? await goalEventsResponse.json() : [];
    return [...events.map(toEventInput), ...goalEvents.map(toGoalEventInput)];
  }, []);

  const handleEventClick = useCallback((info: EventClickInfo) => {
    if (info.event.extendedProps.source === "goal") {
      setSelectedGoalEvent(info.event.extendedProps.goalEvent as GoalCalendarEvent);
      setGoalDetailOpen(true);
      return;
    }
    setSelectedEvent(fromEventApi(info.event));
    setDetailOpen(true);
  }, []);

  const handleSelect = useCallback((info: DateSelectInfo) => {
    setDraftStart(info.start.toISOString());
    setDraftEnd(info.end.toISOString());
    setDraftAllDay(info.allDay);
    setFormOpen(true);
  }, []);

  const handleEventDrop = useCallback((info: EventDropInfo) => {
    persistTimeChange(info.event.id, info.event.start!, info.event.end, () => info.revert());
  }, []);

  const handleEventResize = useCallback((info: EventResizeDoneInfo) => {
    persistTimeChange(info.event.id, info.event.start!, info.event.end, () => info.revert());
  }, []);

  const addButton = useMemo(
    () => ({
      text: "Event",
      click: () => {
        setDraftStart(undefined);
        setDraftEnd(undefined);
        setDraftAllDay(false);
        setFormOpen(true);
      },
    }),
    [],
  );

  return (
    <>
      <EventCalendar
        height="auto"
        timeZone="UTC"
        nowIndicator
        navLinks
        editable
        selectable
        availableViews={["dayGridMonth", "timeGridWeek", "timeGridDay"]}
        addButton={addButton}
        events={events}
        eventClick={handleEventClick}
        select={handleSelect}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
      />

      <EventFormDialog
        calendars={calendars}
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultStartAt={draftStart}
        defaultEndAt={draftEnd}
        defaultIsAllDay={draftAllDay}
      />
      <EventDetailDialog event={selectedEvent} open={detailOpen} onOpenChange={setDetailOpen} />
      <GoalEventDialog event={selectedGoalEvent} open={goalDetailOpen} onOpenChange={setGoalDetailOpen} />
    </>
  );
}
