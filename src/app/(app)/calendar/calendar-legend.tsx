"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import type { Calendar } from "@/lib/services/calendar-service";
import { GOAL_EVENT_COLOR, TODO_EVENT_COLOR } from "@/lib/calendar-constants";
import { ManageCalendarsDialog } from "./manage-calendars-dialog";

export function CalendarLegend({ calendars }: { calendars: Calendar[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent"
      >
        {calendars.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: GOAL_EVENT_COLOR }} />
          Goals
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: TODO_EVENT_COLOR }} />
          Todos
        </span>
        <Settings2 className="size-3.5 shrink-0" />
      </button>
      <ManageCalendarsDialog calendars={calendars} open={open} onOpenChange={setOpen} />
    </>
  );
}
