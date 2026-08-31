import { NextResponse } from "next/server";
import { listEventsForRange } from "@/lib/services/calendar-service";

// A plain Route Handler rather than a Server Action: FullCalendar's
// `events` data source is invoked by the library itself during its own
// mount/view-change lifecycle, and Next.js forbids calling a Server Action
// during a Client Component's initial render ("Server Functions cannot be
// called during initial render" — this is what caused the calendar to
// hang on load). A normal fetch() isn't subject to that restriction.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "Missing start/end" }, { status: 400 });
  }

  try {
    const events = await listEventsForRange(start, end);
    return NextResponse.json(events);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load events" },
      { status: 500 },
    );
  }
}
