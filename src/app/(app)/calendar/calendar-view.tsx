"use client";

import { useState } from "react";
import type { EventApi, EventClickInfo, EventDropInfo, EventInput, EventResizeDoneInfo } from "@fullcalendar/react";
import { EventCalendar } from "@/registry/components/event-calendar";
import type { Calendar, CalendarEvent } from "@/lib/services/calendar-service";
import { listEventsForRangeAction, updateEventTimesAction } from "./actions";
import { EventFormDialog } from "./event-form-dialog";
import { EventDetailDialog } from "./event-detail-dialog";

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

export function CalendarView({ calendars }: { calendars: Calendar[] }) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<string | undefined>(undefined);
  const [draftEnd, setDraftEnd] = useState<string | undefined>(undefined);
  const [draftAllDay, setDraftAllDay] = useState(false);

  async function persistTimeChange(id: string, start: Date, end: Date | null, revert: () => void) {
    try {
      await updateEventTimesAction(id, start.toISOString(), end ? end.toISOString() : null);
    } catch {
      revert();
    }
  }

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
        addButton={{
          text: "Event",
          click: () => {
            setDraftStart(undefined);
            setDraftEnd(undefined);
            setDraftAllDay(false);
            setFormOpen(true);
          },
        }}
        events={(fetchInfo, successCallback, failureCallback) => {
          listEventsForRangeAction(fetchInfo.startStr, fetchInfo.endStr)
            .then((events) => successCallback(events.map(toEventInput)))
            .catch(failureCallback);
        }}
        eventClick={(info: EventClickInfo) => {
          setSelectedEvent(fromEventApi(info.event));
          setDetailOpen(true);
        }}
        select={(info) => {
          setDraftStart(info.start.toISOString());
          setDraftEnd(info.end.toISOString());
          setDraftAllDay(info.allDay);
          setFormOpen(true);
        }}
        eventDrop={(info: EventDropInfo) => {
          persistTimeChange(info.event.id, info.event.start!, info.event.end, () => info.revert());
        }}
        eventResize={(info: EventResizeDoneInfo) => {
          persistTimeChange(info.event.id, info.event.start!, info.event.end, () => info.revert());
        }}
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
    </>
  );
}
