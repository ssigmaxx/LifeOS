import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getDailyScoreSeries } from "@/lib/services/analytics-service";
import { CalendarGrid } from "./calendar-grid";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getUTCFullYear();
  const month = monthParam ? Number(monthParam) : now.getUTCMonth() + 1; // 1-12

  const firstDay = `${year}-${pad(month)}-01`;
  const lastDayNum = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDay = `${year}-${pad(month)}-${pad(lastDayNum)}`;
  const firstWeekday = new Date(`${firstDay}T00:00:00Z`).getUTCDay();

  const series = await getDailyScoreSeries({ start: firstDay, end: lastDay });

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const monthLabel = new Date(`${firstDay}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-1">
          <Link
            href={`/calendar?year=${prevYear}&month=${prevMonth}`}
            className="flex size-8 items-center justify-center rounded-md hover:bg-accent"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="w-32 text-center text-sm font-medium">{monthLabel}</span>
          <Link
            href={`/calendar?year=${nextYear}&month=${nextMonth}`}
            className="flex size-8 items-center justify-center rounded-md hover:bg-accent"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <Card>
        <CardContent>
          <CalendarGrid series={series} firstWeekday={firstWeekday} />
        </CardContent>
      </Card>
    </div>
  );
}
