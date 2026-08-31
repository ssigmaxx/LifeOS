import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ensureDefaultCalendar, listCalendars } from "@/lib/services/calendar-service";
import { CalendarLegend } from "./calendar-legend";
import { CalendarView } from "./calendar-view";
import { IcsImportDialog } from "./ics-import-dialog";

export default async function CalendarPage() {
  await ensureDefaultCalendar();
  const calendars = await listCalendars();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <CalendarLegend calendars={calendars} />
        </div>
        <IcsImportDialog
          calendars={calendars}
          trigger={
            <Button size="sm" variant="outline">
              <Upload className="size-4" /> Import .ics
            </Button>
          }
        />
      </div>

      <CalendarView calendars={calendars} />
    </div>
  );
}
