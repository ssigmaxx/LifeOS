import "server-only";
import { createClient } from "@/lib/supabase/server";
import { calculateGoalProgress, type GoalFrequency } from "@/lib/goal-progress";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export type GoalMetricType =
  | "water_ml"
  | "meditation_minutes"
  | "gym_sessions"
  | "sleep_hours"
  | "fasting_hours";

export type GoalStatus = "active" | "completed" | "abandoned";

export type Goal = {
  id: string;
  name: string;
  description: string | null;
  metricType: GoalMetricType;
  targetValue: number;
  frequency: GoalFrequency;
  startDate: string;
  endDate: string | null;
  status: GoalStatus;
  progressRatio: number;
  displayValue: number;
  sampleSize: number;
};

// One helper per metric, each returning "date -> that day's total" so
// calculateGoalProgress can stay metric-agnostic.
async function getDailyMetricValues(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  metricType: GoalMetricType,
  startDate: string,
  endDate: string,
): Promise<Map<string, number>> {
  const values = new Map<string, number>();

  switch (metricType) {
    case "water_ml": {
      const { data, error } = await supabase
        .from("water_logs")
        .select("amount_ml, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", `${startDate}T00:00:00.000Z`)
        .lt("logged_at", `${endDate}T23:59:59.999Z`);
      if (error) throw error;
      for (const row of data) {
        const date = row.logged_at.slice(0, 10);
        values.set(date, (values.get(date) ?? 0) + row.amount_ml);
      }
      break;
    }
    case "meditation_minutes": {
      const { data, error } = await supabase
        .from("meditation_sessions")
        .select("session_date, duration_minutes")
        .eq("user_id", userId)
        .gte("session_date", startDate)
        .lte("session_date", endDate);
      if (error) throw error;
      for (const row of data) {
        values.set(
          row.session_date,
          (values.get(row.session_date) ?? 0) + row.duration_minutes,
        );
      }
      break;
    }
    case "gym_sessions": {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("workout_date")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("workout_date", startDate)
        .lte("workout_date", endDate);
      if (error) throw error;
      for (const row of data) values.set(row.workout_date, 1);
      break;
    }
    case "sleep_hours": {
      const { data, error } = await supabase
        .from("sleep_logs")
        .select("sleep_end, duration_minutes")
        .eq("user_id", userId)
        .gte("sleep_end", `${startDate}T00:00:00.000Z`)
        .lt("sleep_end", `${endDate}T23:59:59.999Z`);
      if (error) throw error;
      for (const row of data) {
        const date = row.sleep_end.slice(0, 10);
        values.set(date, (values.get(date) ?? 0) + row.duration_minutes / 60);
      }
      break;
    }
    case "fasting_hours": {
      const { data, error } = await supabase
        .from("fasting_sessions")
        .select("start_time, end_time")
        .eq("user_id", userId)
        .not("end_time", "is", null)
        .gte("end_time", `${startDate}T00:00:00.000Z`)
        .lt("end_time", `${endDate}T23:59:59.999Z`);
      if (error) throw error;
      for (const row of data) {
        const date = row.end_time!.slice(0, 10);
        const hours =
          (new Date(row.end_time!).getTime() - new Date(row.start_time).getTime()) /
          3600000;
        values.set(date, (values.get(date) ?? 0) + hours);
      }
      break;
    }
  }

  return values;
}

function mapRow(row: {
  id: string;
  name: string;
  description: string | null;
  metric_type: string;
  target_value: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  status: string;
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    metricType: row.metric_type as GoalMetricType,
    targetValue: row.target_value,
    frequency: row.frequency as GoalFrequency,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as GoalStatus,
  };
}

export async function listGoals(): Promise<Goal[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("goals")
    .select(
      "id, name, description, metric_type, target_value, frequency, start_date, end_date, status",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const today = todayISO();

  return Promise.all(
    data.map(async (row) => {
      const goal = mapRow(row);
      const evalEnd = goal.endDate && goal.endDate < today ? goal.endDate : today;
      const dailyValues = await getDailyMetricValues(
        supabase,
        userId,
        goal.metricType,
        goal.startDate,
        evalEnd,
      );
      const progress = calculateGoalProgress({
        frequency: goal.frequency,
        target: goal.targetValue,
        dailyValues,
        startDate: goal.startDate,
        today: evalEnd,
      });

      return {
        ...goal,
        progressRatio: progress.progressRatio,
        displayValue: progress.displayValue,
        sampleSize: progress.sampleSize,
      };
    }),
  );
}

export type GoalFormValues = {
  name: string;
  description?: string;
  metricType: GoalMetricType;
  targetValue: number;
  frequency: GoalFrequency;
  startDate: string;
  endDate?: string;
};

export async function createGoal(values: GoalFormValues): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    name: values.name,
    description: values.description ?? null,
    metric_type: values.metricType,
    target_value: values.targetValue,
    frequency: values.frequency,
    start_date: values.startDate,
    end_date: values.endDate ?? null,
  });
  if (error) throw error;
}

export async function updateGoal(id: string, values: GoalFormValues): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("goals")
    .update({
      name: values.name,
      description: values.description ?? null,
      metric_type: values.metricType,
      target_value: values.targetValue,
      frequency: values.frequency,
      start_date: values.startDate,
      end_date: values.endDate ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setGoalStatus(id: string, status: GoalStatus): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("goals").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}
