"use server";

import { revalidatePath } from "next/cache";
import { syncCurrentUserFitbit } from "@/lib/services/fitbit-sync-service";

export type SyncResult = { error: string | null };

export async function syncFitbitNowAction(): Promise<SyncResult> {
  try {
    await syncCurrentUserFitbit();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sync failed." };
  }
  revalidatePath("/health");
  return { error: null };
}
