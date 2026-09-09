"use server";

import { revalidatePath } from "next/cache";
import { removeLockPin, setLockPin, verifyLockPin } from "@/lib/services/lock-service";
import { lockPinSchema } from "@/lib/validations/lock";

export type LockActionResult = { ok: boolean; error: string | null };

export async function setLockPinAction(pin: string): Promise<LockActionResult> {
  const parsed = lockPinSchema.safeParse({ pin });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid PIN." };
  }
  try {
    await setLockPin(parsed.data.pin);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to set PIN." };
  }
  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

export async function removeLockPinAction(): Promise<LockActionResult> {
  try {
    await removeLockPin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to remove PIN." };
  }
  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

// Called from the global lock screen, not just Settings — lives here rather
// than settings/actions.ts so a client component outside Settings doesn't
// need to import across a route boundary for it.
export async function verifyLockPinAction(pin: string): Promise<LockActionResult> {
  const parsed = lockPinSchema.safeParse({ pin });
  if (!parsed.success) {
    return { ok: false, error: "Invalid PIN." };
  }
  try {
    const valid = await verifyLockPin(parsed.data.pin);
    return valid ? { ok: true, error: null } : { ok: false, error: "Incorrect PIN." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to verify PIN." };
  }
}
