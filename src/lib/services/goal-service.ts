import "server-only";
import { createClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

export type GoalStatus = "active" | "completed" | "abandoned";

export type Milestone = {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
};

export type Goal = {
  id: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  status: GoalStatus;
  milestones: Milestone[];
  milestonesCompleted: number;
  milestonesTotal: number;
  /** completed/total, 0 if there are no milestones yet. */
  progressRatio: number;
};

function mapMilestone(row: {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
}): Milestone {
  return { id: row.id, title: row.title, completed: row.completed, completedAt: row.completed_at };
}

export async function listGoals(): Promise<Goal[]> {
  const { supabase, userId } = await requireUserId();
  const [{ data: goalRows, error: goalsError }, { data: milestoneRows, error: milestonesError }] =
    await Promise.all([
      supabase
        .from("goals")
        .select("id, name, description, target_date, status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("goal_milestones")
        .select("id, goal_id, title, completed, completed_at")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true }),
    ]);
  if (goalsError) throw goalsError;
  if (milestonesError) throw milestonesError;

  const milestonesByGoal = new Map<string, Milestone[]>();
  for (const row of milestoneRows) {
    const list = milestonesByGoal.get(row.goal_id) ?? [];
    list.push(mapMilestone(row));
    milestonesByGoal.set(row.goal_id, list);
  }

  return goalRows.map((row) => {
    const milestones = milestonesByGoal.get(row.id) ?? [];
    const milestonesCompleted = milestones.filter((m) => m.completed).length;
    const milestonesTotal = milestones.length;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      targetDate: row.target_date,
      status: row.status as GoalStatus,
      milestones,
      milestonesCompleted,
      milestonesTotal,
      progressRatio: milestonesTotal === 0 ? 0 : milestonesCompleted / milestonesTotal,
    };
  });
}

export type GoalFormValues = {
  name: string;
  description?: string;
  targetDate?: string;
};

export async function createGoal(values: GoalFormValues): Promise<string> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      name: values.name,
      description: values.description ?? null,
      target_date: values.targetDate ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateGoal(id: string, values: GoalFormValues): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("goals")
    .update({
      name: values.name,
      description: values.description ?? null,
      target_date: values.targetDate ?? null,
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

export async function addMilestone(goalId: string, title: string): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { count, error: countError } = await supabase
    .from("goal_milestones")
    .select("id", { count: "exact", head: true })
    .eq("goal_id", goalId);
  if (countError) throw countError;

  const { error } = await supabase.from("goal_milestones").insert({
    goal_id: goalId,
    user_id: userId,
    title,
    sort_order: count ?? 0,
  });
  if (error) throw error;
}

export async function toggleMilestone(id: string, completed: boolean): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("goal_milestones")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMilestone(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("goal_milestones").delete().eq("id", id);
  if (error) throw error;
}
