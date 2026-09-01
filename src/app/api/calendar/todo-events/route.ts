import { NextResponse } from "next/server";
import { listTodoCalendarEvents } from "@/lib/services/todo-service";

// Same reasoning as /api/calendar/events and /api/calendar/goal-events —
// FullCalendar's `events` data source is invoked by the library itself,
// so this has to be a plain Route Handler rather than a Server Action.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "Missing start/end" }, { status: 400 });
  }

  try {
    const events = await listTodoCalendarEvents(start, end);
    return NextResponse.json(events);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load todo events" },
      { status: 500 },
    );
  }
}
