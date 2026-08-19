"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreferences } from "@/lib/services/notification-service";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestNotificationAction,
  updateNotificationPreferencesAction,
} from "./actions";

const REMINDER_FIELDS = [
  {
    key: "habitReminder",
    label: "Habit reminder",
    description: "Nudge me about habits I haven't logged yet today.",
  },
  {
    key: "waterReminder",
    label: "Water reminder",
    description: "Nudge me if I'm behind on my water goal.",
  },
  {
    key: "journalReminder",
    label: "Journal reminder",
    description: "Nudge me if I haven't journaled today.",
  },
  {
    key: "morningBriefing",
    label: "Morning briefing",
    description: "A short recap of yesterday to start the day.",
  },
  {
    key: "eveningReview",
    label: "Evening review",
    description: "A prompt to reflect before the day ends.",
  },
] as const;

type FieldKey = (typeof REMINDER_FIELDS)[number]["key"];

function utcTimeToLocalInput(utcHHMM: string): string {
  const [h, m] = utcHHMM.split(":").map(Number);
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m));
  return `${String(utcDate.getHours()).padStart(2, "0")}:${String(utcDate.getMinutes()).padStart(2, "0")}`;
}

function localInputToUtcTime(localHHMM: string): string {
  const [h, m] = localHHMM.split(":").map(Number);
  const now = new Date();
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  return `${String(localDate.getUTCHours()).padStart(2, "0")}:${String(localDate.getUTCMinutes()).padStart(2, "0")}`;
}

async function getReadyRegistration(timeoutMs: number): Promise<ServiceWorkerRegistration | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
  return array;
}

type LocalPrefs = Record<`${FieldKey}Enabled`, boolean> & Record<`${FieldKey}Time`, string>;

function toLocalPrefs(prefs: NotificationPreferences): LocalPrefs {
  return {
    habitReminderEnabled: prefs.habitReminderEnabled,
    habitReminderTime: utcTimeToLocalInput(prefs.habitReminderTime),
    waterReminderEnabled: prefs.waterReminderEnabled,
    waterReminderTime: utcTimeToLocalInput(prefs.waterReminderTime),
    journalReminderEnabled: prefs.journalReminderEnabled,
    journalReminderTime: utcTimeToLocalInput(prefs.journalReminderTime),
    morningBriefingEnabled: prefs.morningBriefingEnabled,
    morningBriefingTime: utcTimeToLocalInput(prefs.morningBriefingTime),
    eveningReviewEnabled: prefs.eveningReviewEnabled,
    eveningReviewTime: utcTimeToLocalInput(prefs.eveningReviewTime),
  };
}

function toServerPrefs(local: LocalPrefs): NotificationPreferences {
  return {
    habitReminderEnabled: local.habitReminderEnabled,
    habitReminderTime: localInputToUtcTime(local.habitReminderTime),
    waterReminderEnabled: local.waterReminderEnabled,
    waterReminderTime: localInputToUtcTime(local.waterReminderTime),
    journalReminderEnabled: local.journalReminderEnabled,
    journalReminderTime: localInputToUtcTime(local.journalReminderTime),
    morningBriefingEnabled: local.morningBriefingEnabled,
    morningBriefingTime: localInputToUtcTime(local.morningBriefingTime),
    eveningReviewEnabled: local.eveningReviewEnabled,
    eveningReviewTime: localInputToUtcTime(local.eveningReviewTime),
  };
}

export function NotificationSettingsForm({
  initialPreferences,
  vapidPublicKey,
}: {
  initialPreferences: NotificationPreferences;
  vapidPublicKey: string | null;
}) {
  const [prefs, setPrefs] = useState<LocalPrefs>(() => toLocalPrefs(initialPreferences));
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Separate from `isPending` above: the initial subscription check must
  // never gate the Save/Enable/Test buttons — a browser where
  // serviceWorker.ready never resolves (unsupported, or blocked) would
  // otherwise leave the whole form permanently disabled.
  const [, startCheckTransition] = useTransition();

  useEffect(() => {
    startCheckTransition(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setSubscribed(false);
        return;
      }
      try {
        const registration = await getReadyRegistration(3000);
        if (!registration) {
          setSubscribed(false);
          return;
        }
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(subscription !== null);
      } catch {
        setSubscribed(false);
      }
    });
  }, []);

  function enablePush() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        if (!vapidPublicKey) throw new Error("Push notifications aren't configured yet.");
        if (Notification.permission === "denied") {
          throw new Error("Notifications are blocked for this site in your browser settings.");
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Notification permission wasn't granted.");

        const registration = await getReadyRegistration(10000);
        if (!registration) throw new Error("Service worker didn't become ready in time.");
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          throw new Error("Browser returned an incomplete subscription.");
        }

        const result = await savePushSubscriptionAction({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        });
        if (result.error) throw new Error(result.error);

        setSubscribed(true);
        setNotice("Push notifications enabled on this device.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to enable notifications.");
      }
    });
  }

  function disablePush() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const registration = await getReadyRegistration(10000);
        if (!registration) throw new Error("Service worker didn't become ready in time.");
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await removePushSubscriptionAction(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setSubscribed(false);
        setNotice("Push notifications disabled on this device.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to disable notifications.");
      }
    });
  }

  function sendTest() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await sendTestNotificationAction();
      if (result.error) setError(result.error);
      else setNotice("Test notification sent.");
    });
  }

  function savePrefs() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(toServerPrefs(prefs));
      if (result.error) setError(result.error);
      else setNotice("Preferences saved.");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Push notifications</CardTitle>
          <CardDescription>
            Enable notifications on this device, then choose which reminders you want below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {subscribed ? (
            <Button variant="outline" onClick={disablePush} disabled={isPending}>
              <BellOff className="size-4" /> Disable on this device
            </Button>
          ) : (
            <Button onClick={enablePush} disabled={isPending || subscribed === null}>
              <Bell className="size-4" /> Enable on this device
            </Button>
          )}
          {subscribed ? (
            <Button variant="outline" onClick={sendTest} disabled={isPending}>
              <Send className="size-4" /> Send test notification
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminders</CardTitle>
          <CardDescription>Times are in your device&apos;s local time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {REMINDER_FIELDS.map(({ key, label, description }) => {
            const enabledKey = `${key}Enabled` as const;
            const timeKey = `${key}Time` as const;
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 last:border-0 last:pb-0">
                <div className="space-y-0.5">
                  <Label htmlFor={`${key}-switch`}>{label}</Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="time"
                    className="w-28"
                    value={prefs[timeKey]}
                    disabled={!prefs[enabledKey]}
                    onChange={(e) => setPrefs((p) => ({ ...p, [timeKey]: e.target.value }))}
                  />
                  <Switch
                    id={`${key}-switch`}
                    checked={prefs[enabledKey]}
                    onCheckedChange={(checked) => setPrefs((p) => ({ ...p, [enabledKey]: checked }))}
                  />
                </div>
              </div>
            );
          })}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

          <Button onClick={savePrefs} disabled={isPending}>
            Save preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
