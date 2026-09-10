"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteOwnAccount } from "@/lib/services/account-service";
import {
  listOwnPushSubscriptions,
  removePushSubscription,
  savePushSubscription,
  updateNotificationPreferences,
  type NotificationPreferences,
  type PushSubscriptionInput,
} from "@/lib/services/notification-service";
import { sendPushNotification } from "@/lib/notifications/push";
import { updateProfile, type ProfileUpdate } from "@/lib/services/profile-service";
import { profileFormSchema } from "@/lib/validations/profile";
import { updatePasswordSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/server";
import { disconnectFitbit } from "@/lib/services/fitbit-service";

export type ActionResult = { error: string | null };

export async function updateNotificationPreferencesAction(
  values: NotificationPreferences,
): Promise<ActionResult> {
  try {
    await updateNotificationPreferences(values);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save preferences." };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function savePushSubscriptionAction(sub: PushSubscriptionInput): Promise<ActionResult> {
  try {
    await savePushSubscription(sub);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save subscription." };
  }
  return { error: null };
}

export async function removePushSubscriptionAction(endpoint: string): Promise<ActionResult> {
  try {
    await removePushSubscription(endpoint);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to remove subscription." };
  }
  return { error: null };
}

export async function sendTestNotificationAction(): Promise<ActionResult> {
  const subs = await listOwnPushSubscriptions();
  if (subs.length === 0) {
    return { error: "No active push subscription on this device yet." };
  }

  const results = await Promise.all(
    subs.map((sub) =>
      sendPushNotification(sub, {
        title: "Meridian",
        body: "Test notification — push is working.",
        url: "/settings",
      }),
    ),
  );

  const staleEndpoints = results
    .map((result, i) => (!result.ok && result.shouldDeleteSubscription ? subs[i].endpoint : null))
    .filter((endpoint): endpoint is string => endpoint !== null);
  await Promise.all(staleEndpoints.map((endpoint) => removePushSubscription(endpoint)));

  return results.some((r) => r.ok) ? { error: null } : { error: "Failed to send test notification." };
}

export type ProfileActionResult = ActionResult & { cycleTrackingAutoEnabled?: boolean };

export async function updateProfileAction(values: {
  displayName: string;
  avatarIcon: string;
  birthDate: string;
  gender: string;
}): Promise<ProfileActionResult> {
  const parsed = profileFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let result;
  try {
    result = await updateProfile(parsed.data as ProfileUpdate);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save profile." };
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { error: null, cycleTrackingAutoEnabled: result.cycleTrackingAutoEnabled };
}

// Deliberately not a reuse of the shared updatePassword action in
// (auth)/actions.ts — that one redirects to "/" on success, which would
// navigate the user away from Settings instead of just confirming in place.
export async function updateOwnPasswordAction(values: {
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

// redirect() throws internally — must stay outside the try, same reasoning
// as api/fitbit/callback/route.ts, or a successful deletion would get
// caught here and reported back as a generic failure instead of redirecting.
export async function deleteAccountAction(): Promise<ActionResult> {
  try {
    await deleteOwnAccount();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete account." };
  }
  redirect("/login?deleted=1");
}

export async function disconnectFitbitAction(): Promise<ActionResult> {
  try {
    await disconnectFitbit();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to disconnect." };
  }
  revalidatePath("/settings");
  return { error: null };
}
