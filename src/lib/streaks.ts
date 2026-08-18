// Habit streak calculations. Kept as pure functions (no DB/date-library
// dependency) so they're cheap to unit test and easy to reason about.
//
// Dates are plain "YYYY-MM-DD" strings throughout — the caller is
// responsible for resolving "today" in the user's timezone before calling
// in, since a habit's local day boundary is not the same as UTC midnight.

export type HabitLogEntry = {
  logDate: string; // "YYYY-MM-DD"
  completed: boolean;
};

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  totalScheduled: number;
  totalCompleted: number;
  completionRate: number; // 0-1, 0 when nothing has been scheduled yet
};

function parseISODate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * scheduleWeekdays: JS Date#getUTCDay() values (0 = Sunday .. 6 = Saturday)
 * the habit is due on. Empty/undefined means "every day".
 */
export function isScheduledOn(
  date: Date,
  scheduleWeekdays: readonly number[] | null | undefined,
): boolean {
  if (!scheduleWeekdays || scheduleWeekdays.length === 0) return true;
  return scheduleWeekdays.includes(date.getUTCDay());
}

export function calculateStreaks({
  logs,
  scheduleWeekdays,
  startDate,
  today,
}: {
  logs: readonly HabitLogEntry[];
  scheduleWeekdays: readonly number[] | null | undefined;
  startDate: string;
  today: string;
}): StreakResult {
  const completedByDate = new Map(
    logs.map((log) => [log.logDate, log.completed]),
  );

  const start = parseISODate(startDate);
  const end = parseISODate(today);

  let totalScheduled = 0;
  let totalCompleted = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    if (!isScheduledOn(cursor, scheduleWeekdays)) continue;

    const dateKey = formatISODate(cursor);
    const isToday = dateKey === today;
    const completed = completedByDate.get(dateKey) === true;

    totalScheduled += 1;
    if (completed) totalCompleted += 1;

    if (completed) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else if (!isToday) {
      // A missed scheduled day breaks the run. Today is exempt here
      // because the day isn't over yet — see currentStreak below for the
      // matching leniency applied from the other direction.
      runningStreak = 0;
    }
  }

  let currentStreak = 0;
  for (let cursor = end; cursor >= start; cursor = addDays(cursor, -1)) {
    if (!isScheduledOn(cursor, scheduleWeekdays)) continue;

    const dateKey = formatISODate(cursor);
    const isToday = dateKey === today;
    const completed = completedByDate.get(dateKey) === true;

    if (completed) {
      currentStreak += 1;
      continue;
    }

    // Today not yet logged doesn't end the streak — the day isn't over.
    // Any earlier missed scheduled day does.
    if (isToday) continue;
    break;
  }

  return {
    currentStreak,
    longestStreak,
    totalScheduled,
    totalCompleted,
    completionRate: totalScheduled === 0 ? 0 : totalCompleted / totalScheduled,
  };
}
