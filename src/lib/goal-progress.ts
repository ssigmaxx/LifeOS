// Pure goal-progress math. Kept dependency-free (no DB) so it's cheap to
// unit test — the service layer is responsible for building the
// dailyValues map from the right table per metric type.

export type GoalFrequency = "daily" | "weekly" | "average";

export type GoalProgressResult = {
  /** 0-1 for daily/weekly; can exceed 1 for average (overachieving) — the
   * caller clamps to 1 for a progress bar but may show the raw number. */
  progressRatio: number;
  /** The headline number to display: days-met (daily), count-this-week
   * (weekly), or the running average (average). */
  displayValue: number;
  /** How many days factored into the calculation — 0 means "not enough
   * data yet" so the caller can show that instead of a misleading 0%. */
  sampleSize: number;
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

/** Most recent Sunday on/before `date` (0 = Sunday, matching Date#getUTCDay). */
function startOfWeek(date: Date): Date {
  return addDays(date, -date.getUTCDay());
}

export function calculateGoalProgress({
  frequency,
  target,
  dailyValues,
  startDate,
  today,
}: {
  frequency: GoalFrequency;
  target: number;
  dailyValues: ReadonlyMap<string, number>;
  startDate: string;
  today: string;
}): GoalProgressResult {
  const start = parseISODate(startDate);
  const end = parseISODate(today);
  if (start > end) return { progressRatio: 0, displayValue: 0, sampleSize: 0 };

  if (frequency === "weekly") {
    const weekStart = startOfWeek(end) > start ? startOfWeek(end) : start;
    let count = 0;
    let days = 0;
    for (let cursor = weekStart; cursor <= end; cursor = addDays(cursor, 1)) {
      days += 1;
      const value = dailyValues.get(formatISODate(cursor));
      if (value != null && value >= 1) count += 1;
    }
    return {
      progressRatio: target === 0 ? 0 : count / target,
      displayValue: count,
      sampleSize: days,
    };
  }

  if (frequency === "average") {
    let sum = 0;
    let sampleSize = 0;
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      const value = dailyValues.get(formatISODate(cursor));
      if (value != null) {
        sum += value;
        sampleSize += 1;
      }
    }
    const avg = sampleSize === 0 ? 0 : sum / sampleSize;
    return {
      progressRatio: sampleSize === 0 || target === 0 ? 0 : avg / target,
      displayValue: avg,
      sampleSize,
    };
  }

  // daily
  let daysMet = 0;
  let totalDays = 0;
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    totalDays += 1;
    const value = dailyValues.get(formatISODate(cursor));
    if (value != null && value >= target) daysMet += 1;
  }
  return {
    progressRatio: totalDays === 0 ? 0 : daysMet / totalDays,
    displayValue: daysMet,
    sampleSize: totalDays,
  };
}
