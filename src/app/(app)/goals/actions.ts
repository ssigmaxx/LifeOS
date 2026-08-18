"use server";

import { revalidatePath } from "next/cache";
import {
  createGoal,
  deleteGoal,
  setGoalStatus,
  updateGoal,
  type GoalStatus,
} from "@/lib/services/goal-service";
import { goalFormSchema } from "@/lib/validations/goal";

export type FormActionState = { error: string | null };

function parseGoalFormData(formData: FormData) {
  return goalFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    metricType: formData.get("metricType"),
    targetValue: formData.get("targetValue"),
    frequency: formData.get("frequency"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
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
  return { error: null };
}

export async function setGoalStatusAction(goalId: string, status: GoalStatus) {
  await setGoalStatus(goalId, status);
  revalidatePath("/goals");
}

export async function deleteGoalAction(goalId: string) {
  await deleteGoal(goalId);
  revalidatePath("/goals");
}
