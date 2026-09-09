import "server-only";
import webpush from "web-push";

// Crashing at import time when these aren't set would take down every route
// that (even transitively) imports this module — including at build time,
// when Next.js collects page data for the cron route with no env available
// yet. Push notifications are an optional feature; missing keys should only
// fail the one call that needs them, not the whole app.
const vapidSubject = process.env.VAPID_SUBJECT;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidConfigured = Boolean(vapidSubject && vapidPublicKey && vapidPrivateKey);
if (vapidConfigured) {
  webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
}

export type PushPayload = { title: string; body: string; url?: string };

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export type PushSendResult =
  | { ok: true }
  | { ok: false; shouldDeleteSubscription: boolean; error: string };

/**
 * Sends one Web Push message. A 404/410 from the push service means the
 * subscription is gone for good (browser uninstalled, permission revoked,
 * endpoint rotated) — the caller should delete it rather than retry.
 */
export async function sendPushNotification(
  target: PushTarget,
  payload: PushPayload,
): Promise<PushSendResult> {
  if (!vapidConfigured) {
    return { ok: false, shouldDeleteSubscription: false, error: "Push notifications are not configured." };
  }
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify({ url: "/", ...payload }),
    );
    return { ok: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    return {
      ok: false,
      shouldDeleteSubscription: statusCode === 404 || statusCode === 410,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
