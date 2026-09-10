import type { DailyHealthMetric } from "@/lib/services/health-service";

export const STEPS_TARGET = 10000;
export const SLEEP_TARGET_MINUTES = 480; // 8h

export type HealthSummary = {
  latestSteps: DailyHealthMetric | null;
  latestHeartRate: DailyHealthMetric | null;
  latestAvgHeartRate: DailyHealthMetric | null;
  latestCalories: DailyHealthMetric | null;
  latestSleep: DailyHealthMetric | null;
  stepsPct: number;
  sleepPct: number;
  stepsRemaining: number;
  sleepDeficitMinutes: number;
  hrBaseline: number | null;
  hrDelta: number | null;
  /**
   * A simple, transparent recovery-style estimate — NOT Google's own
   * internal "Readiness" metric (that isn't exposed by the public Health
   * API). Averages how close last night's sleep came to target with how
   * today's resting heart rate compares to your own recent baseline.
   */
  readinessScore: number | null;
};

// `metrics` is expected sorted newest-first, matching getRecentHealthMetrics.
export function summarizeHealthMetrics(metrics: DailyHealthMetric[]): HealthSummary {
  const latestSteps = metrics.find((m) => m.steps != null) ?? null;
  const latestHeartRate = metrics.find((m) => m.restingHeartRate != null) ?? null;
  const latestAvgHeartRate = metrics.find((m) => m.avgHeartRate != null) ?? null;
  const latestCalories = metrics.find((m) => m.caloriesBurned != null) ?? null;
  const latestSleep = metrics.find((m) => m.sleepMinutes != null) ?? null;

  const stepsPct = latestSteps?.steps != null ? Math.min(latestSteps.steps / STEPS_TARGET, 1) : 0;
  const sleepPct =
    latestSleep?.sleepMinutes != null ? Math.min(latestSleep.sleepMinutes / SLEEP_TARGET_MINUTES, 1) : 0;
  const stepsRemaining = latestSteps?.steps != null ? Math.max(STEPS_TARGET - latestSteps.steps, 0) : STEPS_TARGET;
  const sleepDeficitMinutes =
    latestSleep?.sleepMinutes != null ? Math.max(SLEEP_TARGET_MINUTES - latestSleep.sleepMinutes, 0) : SLEEP_TARGET_MINUTES;

  // Baseline = average of the most recent readings *before* today's, so
  // today is compared against your own trailing average rather than itself.
  const hrHistory = metrics.filter((m) => m.restingHeartRate != null && m !== latestHeartRate);
  const hrBaselineSample = hrHistory.slice(0, 7).map((m) => m.restingHeartRate as number);
  const hrBaseline =
    hrBaselineSample.length > 0
      ? Math.round(hrBaselineSample.reduce((a, b) => a + b, 0) / hrBaselineSample.length)
      : null;
  const hrDelta =
    latestHeartRate?.restingHeartRate != null && hrBaseline != null
      ? latestHeartRate.restingHeartRate - hrBaseline
      : null;

  let readinessScore: number | null = null;
  const sleepScore = latestSleep?.sleepMinutes != null ? Math.min((latestSleep.sleepMinutes / SLEEP_TARGET_MINUTES) * 100, 100) : null;
  // Each bpm above your baseline costs 5 points; below baseline is a
  // (capped) bonus — a rough, clearly-labeled heuristic, not a clinical one.
  const hrScore = hrDelta != null ? Math.max(0, Math.min(100 - hrDelta * 5, 100)) : null;
  const scores = [sleepScore, hrScore].filter((s): s is number => s != null);
  if (scores.length > 0) {
    readinessScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  return {
    latestSteps,
    latestHeartRate,
    latestAvgHeartRate,
    latestCalories,
    latestSleep,
    stepsPct,
    sleepPct,
    stepsRemaining,
    sleepDeficitMinutes,
    hrBaseline,
    hrDelta,
    readinessScore,
  };
}
