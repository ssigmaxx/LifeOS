import { NextResponse } from "next/server";
import { syncAllFitbitConnections } from "@/lib/services/fitbit-sync-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllFitbitConnections();
  return NextResponse.json(result);
}
