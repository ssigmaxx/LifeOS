import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getDailyScoreSeries, getDayDetail } from "@/lib/services/analytics-service";
import { ensureDefaultCalendar, listCalendars, listEventsForRange, type CalendarEvent } from "@/lib/services/calendar-service";
import { listTodosDueInRangeWithId } from "@/lib/services/todo-service";
import { CalendarGrid } from "./calendar-grid";
import { WeekView } from "./week-view";
import { DayDetailContent } from "./day-detail-content";
import { EventFormDialog } from "./event-form-dialog";
import { IcsImportDialog } from "./ics-import-dialog";

type ViewParam = "month" | "week" | "day";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(dateISO: string): string {
  const weekday = new Date(`${dateISO}T00:00:00Z`).getUTCDay();
  return addDays(dateISO, -weekday);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; view?: string; date?: string }>;
}) {
  const { year: yearParam, month: monthParam, view: viewParam, date: dateParam } = await searchParams;
  const view: ViewParam = viewParam === "week" || viewParam === "day" ? viewParam : "month";

  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getUTCFullYear();
  const month = monthParam ? Number(monthParam) : now.getUTCMonth() + 1; // 1-12
  const date = dateParam || todayISO();

  const firstDay = `${year}-${pad(month)}-01`;
  const lastDayNum = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDay = `${year}-${pad(month)}-${pad(lastDayNum)}`;

  await ensureDefaultCalendar();
  const calendars = await listCalendars();

  // Reference date carried across a view switch, so switching from e.g. a
  // past month to Week jumps to that month rather than always "today".
  const referenceDate = view === "month" ? firstDay : date;

  const switcherHref = (nextView: ViewParam) =>
    nextView === "month"
      ? `/calendar?view=month&year=${referenceDate.slice(0, 4)}&month=${Number(referenceDate.slice(5, 7))}`
      : `/calendar?view=${nextView}&date=${referenceDate}`;

  let heading: string;
  let prevHref: string;
  let nextHref: string;
  let body: React.ReactNode;

  if (view === "month") {
    const firstWeekday = new Date(`${firstDay}T00:00:00Z`).getUTCDay();
    const [series, events] = await Promise.all([
      getDailyScoreSeries({ start: firstDay, end: lastDay }),
      listEventsForRange(`${firstDay}T00:00:00.000Z`, `${lastDay}T23:59:59.999Z`),
    ]);

    const eventColorsByDate = new Map<string, string[]>();
    for (const event of events) {
      const eventDate = event.startAt.slice(0, 10);
      const colors = eventColorsByDate.get(eventDate) ?? [];
      if (!colors.includes(event.calendarColor)) colors.push(event.calendarColor);
      eventColorsByDate.set(eventDate, colors);
    }

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    heading = new Date(`${firstDay}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    prevHref = `/calendar?view=month&year=${prevYear}&month=${prevMonth}`;
    nextHref = `/calendar?view=month&year=${nextYear}&month=${nextMonth}`;
    body = <CalendarGrid series={series} firstWeekday={firstWeekday} eventColorsByDate={eventColorsByDate} />;
  } else if (view === "week") {
    const weekStart = startOfWeek(date);
    const weekEnd = addDays(weekStart, 6);
    const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const [series, events, todosByDate] = await Promise.all([
      getDailyScoreSeries({ start: weekStart, end: weekEnd }),
      listEventsForRange(`${weekStart}T00:00:00.000Z`, `${weekEnd}T23:59:59.999Z`),
      listTodosDueInRangeWithId(weekStart, weekEnd),
    ]);

    const scoreByDate = new Map(series.map((p) => [p.date, p.score]));
    const eventsByDate = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const eventDate = event.startAt.slice(0, 10);
      const list = eventsByDate.get(eventDate) ?? [];
      list.push(event);
      eventsByDate.set(eventDate, list);
    }

    const weekStartLabel = new Date(`${weekStart}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const weekEndLabel = new Date(`${weekEnd}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });

    heading = `${weekStartLabel} – ${weekEndLabel}`;
    prevHref = `/calendar?view=week&date=${addDays(weekStart, -7)}`;
    nextHref = `/calendar?view=week&date=${addDays(weekStart, 7)}`;
    body = <WeekView dates={dates} scoreByDate={scoreByDate} eventsByDate={eventsByDate} todosByDate={todosByDate} />;
  } else {
    const detail = await getDayDetail(date);
    heading = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    prevHref = `/calendar?view=day&date=${addDays(date, -1)}`;
    nextHref = `/calendar?view=day&date=${addDays(date, 1)}`;
    body = (
      <Card>
        <CardContent>
          <DayDetailContent detail={detail} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-1">
          <Link
            href={prevHref}
            className="flex size-8 items-center justify-center rounded-md hover:bg-accent"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="w-40 text-center text-sm font-medium">{heading}</span>
          <Link
            href={nextHref}
            className="flex size-8 items-center justify-center rounded-md hover:bg-accent"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="flex gap-2">
          <IcsImportDialog
            calendars={calendars}
            trigger={
              <Button size="sm" variant="outline">
                <Upload className="size-4" /> Import .ics
              </Button>
            }
          />
          <EventFormDialog
            calendars={calendars}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Event
              </Button>
            }
          />
        </div>
      </div>

      <div className="inline-flex w-fit rounded-lg bg-muted p-0.5">
        {(["day", "week", "month"] as ViewParam[]).map((v) => (
          <Link
            key={v}
            href={switcherHref(v)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
              v === view ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v}
          </Link>
        ))}
      </div>

      {view === "month" ? (
        <Card>
          <CardContent>{body}</CardContent>
        </Card>
      ) : (
        body
      )}
    </div>
  );
}
