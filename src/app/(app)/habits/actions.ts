"use server";

import { revalidatePath } from "next/cache";
import {
  archiveHabit,
  clearHabitLogToday,
  createCategory,
  createHabit,
  deleteHabit,
  logHabitToday,
  setHabitActive,
  updateHabit,
} from "@/lib/services/habit-service";
import { habitFormSchema, newCategorySchema } from "@/lib/validations/habit";

export type FormActionState = {
  error: string | null;
};

function parseHabitFormData(formData: FormData) {
  return habitFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    icon: formData.get("icon"),
    trackingType: formData.get("trackingType"),
    unit: formData.get("unit"),
    targetValue: formData.get("targetValue"),
    scoreWeight: formData.get("scoreWeight") || "1",
    startDate: formData.get("startDate"),
    frequency: formData.get("frequency"),
    weekdays: formData.getAll("weekdays"),
  });
}

export async function createHabitAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = parseHabitFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createHabit(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create habit." };
  }

  revalidatePath("/habits");
  revalidatePath("/today");
  return { error: null };
}

export async function updateHabitAction(
  habitId: string,
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = parseHabitFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateHabit(habitId, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update habit." };
  }

  revalidatePath("/habits");
  revalidatePath("/today");
  return { error: null };
}

export async function createCategoryAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = newCategorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createCategory(parsed.data.name);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create category." };
  }

  revalidatePath("/habits");
  return { error: null };
}

export async function pauseHabitAction(habitId: string) {
  await setHabitActive(habitId, false);
  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function resumeHabitAction(habitId: string) {
  await setHabitActive(habitId, true);
  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function archiveHabitAction(habitId: string) {
  await archiveHabit(habitId);
  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function deleteHabitAction(habitId: string) {
  await deleteHabit(habitId);
  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function logHabitTodayAction(
  habitId: string,
  value: { valueBoolean?: boolean; valueNumeric?: number; valueSeconds?: number },
) {
  await logHabitToday(habitId, value);
  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function clearHabitLogTodayAction(habitId: string) {
  await clearHabitLogToday(habitId);
  revalidatePath("/habits");
  revalidatePath("/today");
}
