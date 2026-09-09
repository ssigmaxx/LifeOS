import { NextResponse } from "next/server";
import { isCycleTrackingEnabled, listPeriodDates } from "@/lib/services/cycle-service";

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
    // it back off) should never see period markers on their calendar, so
    // this returns an empty list rather than an error in that case.
    if (!(await isCycleTrackingEnabled())) {
      return NextResponse.json([]);
    }
    const dates = await listPeriodDates({ start, end });
    return NextResponse.json(dates);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load period days" },
      { status: 500 },
    );
  }
}
