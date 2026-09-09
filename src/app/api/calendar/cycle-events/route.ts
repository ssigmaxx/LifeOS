import { NextResponse } from "next/server";
import { addDays } from "@/lib/cycle-prediction";
import { isCycleTrackingEnabled, listPeriodDates, predictNextPeriod } from "@/lib/services/cycle-service";

function clippedRange(rangeStart: string, rangeEnd: string, start: string, end: string): string[] {
  const dates: string[] = [];
  for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) {
    if (d >= start && d <= end) dates.push(d);
  }
  return dates;
}

// A plain Route Handler, not a Server Action — same reason as
// api/calendar/events/route.ts: FullCalendar's own client-side fetch
// lifecycle can't call a Server Action during initial render.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "Missing start/end" }, { status: 400 });
  }

  try {
    // Cycle tracking is opt-in — a user who never turned it on (or turned
    // it back off) should never see period/PMS markers on their calendar,
    // so this returns empty lists rather than an error in that case.
    if (!(await isCycleTrackingEnabled())) {
      return NextResponse.json({ periodDates: [], pmsDates: [] });
    }

    const [periodDates, prediction] = await Promise.all([
      listPeriodDates({ start, end }),
      predictNextPeriod(),
    ]);
    const pmsDates =
      prediction.pmsWindowStart && prediction.pmsWindowEnd
        ? clippedRange(prediction.pmsWindowStart, prediction.pmsWindowEnd, start, end)
        : [];

    return NextResponse.json({ periodDates, pmsDates });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load cycle days" },
      { status: 500 },
    );
  }
}
