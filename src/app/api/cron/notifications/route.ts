import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/notifications/push";
import {
  getUserHabitContext,
  getUserTodosTodayContext,
  getUserWaterContext,
  userHasJournalEntryToday,
} from "@/lib/notifications/admin-data";
import {
  buildEveningReviewMessage,
  buildHabitReminderMessage,
  buildJournalReminderMessage,
  buildMorningBriefingMessage,
  buildWaterReminderMessage,
  isReminderDue,
  type ReminderKind,
} from "@/lib/notifications/reminder-engine";

export const dynamic = "force-dynamic";

const REMINDER_KINDS: ReminderKind[] = [
  "habit",
  "water",
  "journal",
  "morning_briefing",
  "evening_review",
];

const COLUMNS: Record<ReminderKind, { enabled: string; time: string; lastSent: string }> = {
  habit: {
    enabled: "habit_reminder_enabled",
    time: "habit_reminder_time",
    lastSent: "habit_reminder_last_sent",
  },
  water: {
    enabled: "water_reminder_enabled",
    time: "water_reminder_time",
    lastSent: "water_reminder_last_sent",
  },
  journal: {
    enabled: "journal_reminder_enabled",
    time: "journal_reminder_time",
    lastSent: "journal_reminder_last_sent",
  },
  morning_briefing: {
    enabled: "morning_briefing_enabled",
    time: "morning_briefing_time",
    lastSent: "morning_briefing_last_sent",
  },
  evening_review: {
    enabled: "evening_review_enabled",
    time: "evening_review_time",
    lastSent: "evening_review_last_sent",
  },
};

const URL_BY_KIND: Record<ReminderKind, string> = {
  habit: "/today",
  water: "/today",
  journal: "/journal",
  morning_briefing: "/today",
  evening_review: "/recap",
};

type AdminClient = ReturnType<typeof createAdminClient>;

async function buildMessage(
  admin: AdminClient,
  kind: ReminderKind,
  userId: string,
  todayISO: string,
): Promise<string | null> {
  switch (kind) {
    case "habit": {
      const ctx = await getUserHabitContext(admin, userId, todayISO);
      return buildHabitReminderMessage(ctx.today);
    }
    case "water": {
      const water = await getUserWaterContext(admin, userId, todayISO);
      return buildWaterReminderMessage(water);
    }
    case "journal": {
      const hasEntry = await userHasJournalEntryToday(admin, userId, todayISO);
      return buildJournalReminderMessage({ hasEntryToday: hasEntry });
    }
    case "morning_briefing": {
      const ctx = await getUserHabitContext(admin, userId, todayISO);
      return buildMorningBriefingMessage({
        yesterdayCompletedCount: ctx.yesterday.completedCount,
        yesterdayTotalCount: ctx.yesterday.dueCount,
        bestStreak: ctx.bestActiveStreak,
      });
    }
    case "evening_review": {
      const [habitCtx, todos] = await Promise.all([
        getUserHabitContext(admin, userId, todayISO),
        getUserTodosTodayContext(admin, userId, todayISO),
      ]);
      return buildEveningReviewMessage({ habits: habitCtx.today, todos });
    }
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  const enabledFilter = REMINDER_KINDS.map((kind) => `${COLUMNS[kind].enabled}.eq.true`).join(",");
  const { data: prefRows, error: prefError } = await admin
    .from("notification_preferences")
    .select("*")
    .or(enabledFilter);
  if (prefError) {
    return NextResponse.json({ error: prefError.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const pref of prefRows ?? []) {
    for (const kind of REMINDER_KINDS) {
      const cols = COLUMNS[kind];
      if (!pref[cols.enabled]) continue;
      if (!isReminderDue({ now, timeUTC: pref[cols.time], lastSentDate: pref[cols.lastSent] })) continue;

      const markSent = () =>
        admin
          .from("notification_preferences")
          .update({ [cols.lastSent]: todayISO })
          .eq("user_id", pref.user_id);

      const message = await buildMessage(admin, kind, pref.user_id, todayISO);
      if (message === null) {
        skipped += 1;
        await markSent();
        continue;
      }

      const { data: subs, error: subsError } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth_key")
        .eq("user_id", pref.user_id);
      if (subsError) throw subsError;

      if (!subs || subs.length === 0) {
        skipped += 1;
        await markSent();
        continue;
      }

      const results = await Promise.all(
        subs.map((sub) =>
          sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth_key },
            { title: "LifeOS", body: message, url: URL_BY_KIND[kind] },
          ),
        ),
      );

      const staleEndpoints = results
        .map((result, i) => (!result.ok && result.shouldDeleteSubscription ? subs[i].endpoint : null))
        .filter((endpoint): endpoint is string => endpoint !== null);
      if (staleEndpoints.length > 0) {
        await admin.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
      }

      if (results.some((r) => r.ok)) sent += 1;
      else failed += 1;

      await markSent();
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
