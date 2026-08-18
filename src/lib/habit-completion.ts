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
