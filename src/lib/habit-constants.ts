import type { TrackingType } from "@/lib/habit-completion";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
  boolean: "Yes / No",
  numeric: "Numeric",
  duration: "Duration",
  counter: "Counter",
  time: "Time",
};

export const TRACKING_TYPE_HINTS: Record<TrackingType, string> = {
  boolean: "Done or not done each day.",
  numeric: "A measured amount, e.g. liters of water.",
  duration: "Minutes spent, e.g. meditation.",
  counter: "A count of repetitions, e.g. push-ups.",
  time: "A specific clock time, e.g. wake-up time.",
};
