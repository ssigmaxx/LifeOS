import type { GoalMetricType } from "@/lib/services/goal-service";
import type { GoalFrequency } from "@/lib/goal-progress";

export const METRIC_LABELS: Record<GoalMetricType, string> = {
  water_ml: "Water",
  meditation_minutes: "Meditation",
  gym_sessions: "Gym",
  sleep_hours: "Sleep",
  fasting_hours: "Fasting",
};

export const METRIC_UNITS: Record<GoalMetricType, string> = {
  water_ml: "ml",
  meditation_minutes: "minutes",
  gym_sessions: "sessions",
  sleep_hours: "hours",
  fasting_hours: "hours",
};

export const METRIC_DEFAULT_FREQUENCY: Record<GoalMetricType, GoalFrequency> = {
  water_ml: "daily",
  meditation_minutes: "daily",
  gym_sessions: "weekly",
  sleep_hours: "average",
  fasting_hours: "average",
};

export const FREQUENCY_LABELS: Record<GoalFrequency, string> = {
  daily: "Every day",
  weekly: "Per week",
  average: "On average",
};

export const FREQUENCY_HINTS: Record<GoalFrequency, string> = {
  daily: "Progress is the share of days you hit the target.",
  weekly: "Progress is how many qualifying days you've had this week.",
  average: "Progress is your running average since the start date.",
};
