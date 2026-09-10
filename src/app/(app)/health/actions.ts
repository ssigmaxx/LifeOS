"use server";

import { revalidatePath } from "next/cache";
import { syncCurrentUserFitbit } from "@/lib/services/fitbit-sync-service";

export type SyncResult = { error: string | null };

// Supabase errors are plain objects (not `instanceof Error`), so a naive
// `err instanceof Error` check swallowed their real .message and fell back
// to a useless generic string — this is what actually happened here.
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Sync failed.";
}

export async function syncFitbitNowAction(): Promise<SyncResult> {
  try {
    await syncCurrentUserFitbit();
  } catch (err) {
    console.error("[fitbit-sync] sync now failed:", err);
    return { error: errorMessage(err) };
  }
  revalidatePath("/health");
  return { error: null };
}
