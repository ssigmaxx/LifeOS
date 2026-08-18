// Small numeric helpers for analytics aggregation. Pure and dependency-free
// so they're cheap to unit test.

export function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function minOf(values: readonly number[]): number | null {
  return values.length === 0 ? null : Math.min(...values);
}

export function maxOf(values: readonly number[]): number | null {
  return values.length === 0 ? null : Math.max(...values);
}

/**
 * Population standard deviation — used as a simple "consistency" measure
 * (e.g. for sleep duration). Lower is more consistent. Null with fewer
 * than 2 samples, since variance is meaningless for a single point.
 */
export function stdDev(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const avg = average(values)!;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
