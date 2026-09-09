// Next-period estimation. Kept as a pure function (no DB dependency) so
// it's cheap to unit test — the same reasoning as streaks.ts. There is no
// external "predict a period" API to call here: this is derived entirely
// from the gap between this person's own past logged period starts, which
// only their own history can tell you.
//
// Dates are plain "YYYY-MM-DD" strings throughout.

function parseISODate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateISO: string, days: number): string {
  const date = parseISODate(dateISO);
  date.setUTCDate(date.getUTCDate() + days);
  return formatISODate(date);
}

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / 86_400_000);
}

export type CyclePrediction = {
  nextPeriodStart: string | null;
  averageCycleLengthDays: number | null;
  /** How many completed cycles the average is based on. */
  cyclesUsed: number;
  lastPeriodStart: string | null;
};

const MIN_PLAUSIBLE_CYCLE_DAYS = 15;
const MAX_PLAUSIBLE_CYCLE_DAYS = 90;
const MAX_CYCLES_IN_AVERAGE = 6;

/**
 * periodDates: every logged date with a period flow, in any order, no
 * duplicates required to be pre-sorted. A "period start" is any date
 * whose previous day isn't also in the list, so a multi-day period only
 * counts once. Cycle lengths outside a plausible human range are dropped
 * as likely gaps in logging rather than real short/long cycles, so one
 * missed-logging gap doesn't skew the average.
 */
export function estimateNextPeriod(periodDates: string[]): CyclePrediction {
  const sorted = [...new Set(periodDates)].sort();
  const dateSet = new Set(sorted);
  const starts = sorted.filter((d) => !dateSet.has(addDays(d, -1)));

  if (starts.length === 0) {
    return { nextPeriodStart: null, averageCycleLengthDays: null, cyclesUsed: 0, lastPeriodStart: null };
  }

  const lastPeriodStart = starts[starts.length - 1];
  const lengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const length = daysBetween(starts[i - 1], starts[i]);
    if (length >= MIN_PLAUSIBLE_CYCLE_DAYS && length <= MAX_PLAUSIBLE_CYCLE_DAYS) lengths.push(length);
  }

  if (lengths.length === 0) {
    return { nextPeriodStart: null, averageCycleLengthDays: null, cyclesUsed: 0, lastPeriodStart };
  }

  const recent = lengths.slice(-MAX_CYCLES_IN_AVERAGE);
  const averageCycleLengthDays = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
  return {
    nextPeriodStart: addDays(lastPeriodStart, averageCycleLengthDays),
    averageCycleLengthDays,
    cyclesUsed: recent.length,
    lastPeriodStart,
  };
}
