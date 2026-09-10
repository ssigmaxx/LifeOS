import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { syncAllFitbitConnections } from "@/lib/services/fitbit-sync-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllFitbitConnections();
  return NextResponse.json(result);
}
