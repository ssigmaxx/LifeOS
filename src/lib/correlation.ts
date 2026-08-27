// Pure correlation math for cross-metric insights. Kept dependency-free (no
// DB) so it's cheap to unit test — analytics-service.ts is responsible for
// building each metric's "date -> value" map and pairing them up before
// calling this.

/** Pearson correlation coefficient. Null if there are fewer than 2 samples
 * or either variable has zero variance (a constant series has no defined
 * correlation, and dividing by its zero stddev would give NaN/Infinity). */
export function pearsonCorrelation(pairs: readonly (readonly [number, number])[]): number | null {
  const n = pairs.length;
  if (n < 2) return null;

  const meanA = pairs.reduce((sum, [a]) => sum + a, 0) / n;
  const meanB = pairs.reduce((sum, [, b]) => sum + b, 0) / n;

  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (const [a, b] of pairs) {
    const da = a - meanA;
    const db = b - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }
  if (varianceA === 0 || varianceB === 0) return null;

  return covariance / Math.sqrt(varianceA * varianceB);
}

/** Intersects two "date -> value" maps into paired samples on shared dates
 * only — a day logged for one metric but not the other contributes nothing
 * to the correlation. */
export function pairSamples(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): [number, number][] {
  const pairs: [number, number][] = [];
  for (const [date, valueA] of a) {
    const valueB = b.get(date);
    if (valueB != null) pairs.push([valueA, valueB]);
  }
  return pairs;
}

export type CorrelationStrength = "weak" | "moderate" | "strong";
export type CorrelationDirection = "positive" | "negative";

export function describeCorrelation(r: number): { strength: CorrelationStrength; direction: CorrelationDirection } {
  const magnitude = Math.abs(r);
  const strength: CorrelationStrength = magnitude >= 0.6 ? "strong" : magnitude >= 0.4 ? "moderate" : "weak";
  return { strength, direction: r >= 0 ? "positive" : "negative" };
}
