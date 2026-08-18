import type { TrackingType } from "@/lib/habit-completion";
import type { GoalFrequency } from "@/lib/goal-progress";
import type { GoalMetricType } from "@/lib/services/goal-service";

export type HabitProposal = {
  kind: "habit";
  name: string;
  description?: string;
  trackingType: TrackingType;
  targetValue?: number;
  unit?: string;
  frequency: "daily" | "custom";
  weekdays?: number[];
};

export type GoalProposal = {
  kind: "goal";
  name: string;
  description?: string;
  metricType: GoalMetricType;
  targetValue: number;
  frequency: GoalFrequency;
};

export type Proposal = HabitProposal | GoalProposal;

export type ToolExecutionResult = {
  /** JSON-serializable — sent back to Gemini as the functionResponse. */
  forModel: unknown;
  /** Surfaced to the client UI as a confirmable card; never sent to Gemini
   * beyond the plain confirmation text in forModel. */
  proposal?: Proposal;
};
