import "server-only";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

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
