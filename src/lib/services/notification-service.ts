import "server-only";
import { createClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

export type NotificationPreferences = {
  habitReminderEnabled: boolean;
  habitReminderTime: string; // "HH:MM", UTC
  waterReminderEnabled: boolean;
  waterReminderTime: string;
  journalReminderEnabled: boolean;
  journalReminderTime: string;
  morningBriefingEnabled: boolean;
  morningBriefingTime: string;
  eveningReviewEnabled: boolean;
  eveningReviewTime: string;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  habitReminderEnabled: false,
  habitReminderTime: "20:00",
  waterReminderEnabled: false,
  waterReminderTime: "15:00",
  journalReminderEnabled: false,
  journalReminderTime: "21:00",
  morningBriefingEnabled: false,
  morningBriefingTime: "07:00",
  eveningReviewEnabled: false,
  eveningReviewTime: "21:30",
};

function mapRow(row: {
  habit_reminder_enabled: boolean;
  habit_reminder_time: string;
  water_reminder_enabled: boolean;
  water_reminder_time: string;
  journal_reminder_enabled: boolean;
  journal_reminder_time: string;
  morning_briefing_enabled: boolean;
  morning_briefing_time: string;
  evening_review_enabled: boolean;
  evening_review_time: string;
}): NotificationPreferences {
  return {
    habitReminderEnabled: row.habit_reminder_enabled,
    habitReminderTime: row.habit_reminder_time.slice(0, 5),
    waterReminderEnabled: row.water_reminder_enabled,
    waterReminderTime: row.water_reminder_time.slice(0, 5),
    journalReminderEnabled: row.journal_reminder_enabled,
    journalReminderTime: row.journal_reminder_time.slice(0, 5),
    morningBriefingEnabled: row.morning_briefing_enabled,
    morningBriefingTime: row.morning_briefing_time.slice(0, 5),
    eveningReviewEnabled: row.evening_review_enabled,
    eveningReviewTime: row.evening_review_time.slice(0, 5),
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "habit_reminder_enabled, habit_reminder_time, water_reminder_enabled, water_reminder_time, journal_reminder_enabled, journal_reminder_time, morning_briefing_enabled, morning_briefing_time, evening_review_enabled, evening_review_time",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : DEFAULT_PREFERENCES;
}

export async function updateNotificationPreferences(
  values: NotificationPreferences,
): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      habit_reminder_enabled: values.habitReminderEnabled,
      habit_reminder_time: values.habitReminderTime,
      water_reminder_enabled: values.waterReminderEnabled,
      water_reminder_time: values.waterReminderTime,
      journal_reminder_enabled: values.journalReminderEnabled,
      journal_reminder_time: values.journalReminderTime,
      morning_briefing_enabled: values.morningBriefingEnabled,
      morning_briefing_time: values.morningBriefingTime,
      evening_review_enabled: values.eveningReviewEnabled,
      evening_review_time: values.eveningReviewTime,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function savePushSubscription(sub: PushSubscriptionInput): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth_key: sub.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error) throw error;
}

export async function listOwnPushSubscriptions(): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", userId);
  if (error) throw error;
  return data.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth_key }));
}
