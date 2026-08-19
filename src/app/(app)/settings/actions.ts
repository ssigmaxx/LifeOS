"use server";

import { revalidatePath } from "next/cache";
import {
  listOwnPushSubscriptions,
  removePushSubscription,
  savePushSubscription,
  updateNotificationPreferences,
  type NotificationPreferences,
  type PushSubscriptionInput,
} from "@/lib/services/notification-service";
import { sendPushNotification } from "@/lib/notifications/push";

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
        title: "LifeOS",
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
