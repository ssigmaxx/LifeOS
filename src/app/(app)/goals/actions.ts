"use server";

import { revalidatePath } from "next/cache";
import {
  addMilestone,
  createGoal,
  deleteGoal,
  deleteMilestone,
  setGoalStatus,
  toggleMilestone,
  updateGoal,
  type GoalStatus,
} from "@/lib/services/goal-service";
import { goalFormSchema, milestoneFormSchema } from "@/lib/validations/goal";

export type FormActionState = { error: string | null };

function parseGoalFormData(formData: FormData) {
  return goalFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    targetDate: formData.get("targetDate"),
  });
}

export async function createGoalAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = parseGoalFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createGoal(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create goal." };
  }

  revalidatePath("/goals");
  revalidatePath("/journal");
  return { error: null };
}

export async function updateGoalAction(
  goalId: string,
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = parseGoalFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateGoal(goalId, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update goal." };
  }

  revalidatePath("/goals");
  revalidatePath("/journal");
  return { error: null };
}

export async function setGoalStatusAction(goalId: string, status: GoalStatus) {
  await setGoalStatus(goalId, status);
  revalidatePath("/goals");
  revalidatePath("/journal");
}

export async function deleteGoalAction(goalId: string) {
  await deleteGoal(goalId);
  revalidatePath("/goals");
  revalidatePath("/journal");
}

export async function addMilestoneAction(
  goalId: string,
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = milestoneFormSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid milestone." };
  }
  try {
    await addMilestone(goalId, parsed.data.title);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to add milestone." };
  }
  revalidatePath("/goals");
  revalidatePath("/journal");
  return { error: null };
}

export async function toggleMilestoneAction(id: string, completed: boolean) {
  await toggleMilestone(id, completed);
  revalidatePath("/goals");
  revalidatePath("/journal");
}

export async function deleteMilestoneAction(id: string) {
  await deleteMilestone(id);
  revalidatePath("/goals");
  revalidatePath("/journal");
}
