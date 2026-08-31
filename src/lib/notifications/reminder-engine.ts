// Pure, dependency-free reminder logic: given "now" plus already-fetched
// data, decide whether a reminder is due and what its message should say.
// No DB/date-library dependency, so it's cheap to unit test — all I/O
// (fetching preferences, habit/water/journal data, sending the push) lives
// in the cron route that calls this.

export type ReminderKind =
  | "habit"
  | "water"
  | "journal"
  | "morning_briefing"
  | "evening_review";

/**
 * A reminder is due once "now" has passed today's scheduled time (in UTC)
 * and it hasn't already been sent today. Using "now >= scheduled" rather
 * than an exact window match means a delayed or missed cron tick still
 * catches up on its next run instead of silently skipping the day.
 */
export function isReminderDue({
  now,
  timeUTC,
  lastSentDate,
}: {
  now: Date;
  timeUTC: string; // "HH:MM" or "HH:MM:SS", UTC
  lastSentDate: string | null; // "YYYY-MM-DD", UTC
}): boolean {
  const today = now.toISOString().slice(0, 10);
  if (lastSentDate === today) return false;

  const [hours, minutes] = timeUTC.split(":").map(Number);
  const scheduled = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes),
  );
  return now >= scheduled;
}

/** Null means "don't send" — e.g. nothing due, or the goal is already met. */
export function buildHabitReminderMessage({
  dueCount,
  completedCount,
}: {
  dueCount: number;
  completedCount: number;
}): string | null {
  const remaining = dueCount - completedCount;
  if (dueCount === 0 || remaining <= 0) return null;
  return remaining === 1
    ? "1 habit is still open today — a quick win before the day ends."
    : `${remaining} habits are still open today — quick wins before the day ends.`;
}

export function buildWaterReminderMessage({
  totalMl,
  targetMl,
}: {
  totalMl: number;
  targetMl: number;
}): string | null {
  if (targetMl <= 0 || totalMl >= targetMl) return null;
  return `You're at ${totalMl}ml of your ${targetMl}ml water goal — ${targetMl - totalMl}ml to go.`;
}

export function buildJournalReminderMessage({
  hasEntryToday,
}: {
  hasEntryToday: boolean;
}): string | null {
  if (hasEntryToday) return null;
  return "No journal entry yet today. A couple of sentences is enough.";
}

export function buildMorningBriefingMessage({
  yesterdayCompletedCount,
  yesterdayTotalCount,
  bestStreak,
}: {
  yesterdayCompletedCount: number;
  yesterdayTotalCount: number;
  bestStreak: { habitName: string; length: number } | null;
}): string {
  const parts: string[] = [];
  if (yesterdayTotalCount > 0) {
    parts.push(`Yesterday: ${yesterdayCompletedCount}/${yesterdayTotalCount} habits done.`);
  }
  if (bestStreak && bestStreak.length > 1) {
    parts.push(`${bestStreak.habitName} streak: ${bestStreak.length} days.`);
  }
  return parts.length === 0 ? "Good morning. Have a great day." : `Good morning. ${parts.join(" ")}`;
}

export function buildEveningReviewMessage({
  habits,
  todos,
}: {
  habits: { dueCount: number; completedCount: number };
  todos: { dueCount: number; completedCount: number };
}): string {
  const parts: string[] = [];
  if (habits.dueCount > 0) parts.push(`${habits.completedCount}/${habits.dueCount} habits`);
  if (todos.dueCount > 0) parts.push(`${todos.completedCount}/${todos.dueCount} todos`);

  if (parts.length === 0) return "Time for your daily recap — how did today go?";
  return `${parts.join(", ")} done today. See your recap.`;
}
