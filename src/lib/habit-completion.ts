export type TrackingType = "boolean" | "numeric" | "duration" | "counter" | "time";

export type RawHabitLogValue = {
  valueBoolean: boolean | null;
  valueNumeric: number | null;
  valueSeconds: number | null;
  targetValueSnapshot: number | null;
};

/**
 * Whether a logged value counts as "done" for the day. A target makes this
 * a >= comparison (<= for "time", where the target is a latest-by clock
 * time); no target means any logged value counts.
 */
export function isLogComplete(
  trackingType: TrackingType,
  log: RawHabitLogValue,
): boolean {
  switch (trackingType) {
    case "boolean":
      return log.valueBoolean === true;
    case "numeric":
    case "counter":
      if (log.valueNumeric == null) return false;
      return log.targetValueSnapshot != null
        ? log.valueNumeric >= log.targetValueSnapshot
        : true;
    case "duration":
      if (log.valueSeconds == null) return false;
      return log.targetValueSnapshot != null
        ? log.valueSeconds >= log.targetValueSnapshot
        : true;
    case "time":
      if (log.valueSeconds == null) return false;
      return log.targetValueSnapshot != null
        ? log.valueSeconds <= log.targetValueSnapshot
        : true;
  }
}

/**
 * 0-1 credit toward the daily score. Targeted numeric/counter/duration
 * habits get partial credit (e.g. 2.5L of a 3L target = 0.83) so the score
 * reflects effort, not just pass/fail; everything else is binary. This
 * keeps a single large numeric habit from swamping a boolean one — the
 * caller still applies score_weight on top of this 0-1 value.
 */
export function getCompletionFraction(
  trackingType: TrackingType,
  log: RawHabitLogValue,
): number {
  const hasTarget = log.targetValueSnapshot != null && log.targetValueSnapshot > 0;

  if (hasTarget && (trackingType === "numeric" || trackingType === "counter")) {
    if (log.valueNumeric == null) return 0;
    return Math.min(log.valueNumeric / log.targetValueSnapshot!, 1);
  }
  if (hasTarget && trackingType === "duration") {
    if (log.valueSeconds == null) return 0;
    return Math.min(log.valueSeconds / log.targetValueSnapshot!, 1);
  }

  return isLogComplete(trackingType, log) ? 1 : 0;
}

/**
 * Weighted daily score across a set of habits (0-1). Each habit's
 * completion fraction is computed independently before weighting, so a
 * large numeric habit can never dominate a boolean one just because its
 * raw value is bigger (spec section 42).
 */
export function calculateDailyHabitsScore(
  entries: readonly {
    trackingType: TrackingType;
    scoreWeight: number;
    log: RawHabitLogValue | null;
  }[],
): number | null {
  const totalWeight = entries.reduce((sum, e) => sum + e.scoreWeight, 0);
  if (totalWeight <= 0) return null;

  const earned = entries.reduce((sum, e) => {
    const fraction = e.log
      ? getCompletionFraction(e.trackingType, e.log)
      : 0;
    return sum + fraction * e.scoreWeight;
  }, 0);

  return earned / totalWeight;
}
