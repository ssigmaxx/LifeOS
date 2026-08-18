"use server";

import { revalidatePath } from "next/cache";
import { addWaterLog, deleteWaterLog } from "@/lib/services/water-service";
import { deleteSleepLog, logSleep } from "@/lib/services/sleep-service";
import { cancelFast, endFast, startFast } from "@/lib/services/fasting-service";
import { logMeditation } from "@/lib/services/meditation-service";
import { clearTodayWorkout, logTodayWorkout } from "@/lib/services/workout-service";

export async function addWaterLogAction(amountMl: number) {
  await addWaterLog(amountMl);
  revalidatePath("/today");
}

export async function deleteWaterLogAction(id: string) {
  await deleteWaterLog(id);
  revalidatePath("/today");
}

export type FormActionState = { error: string | null };

export async function logSleepAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const sleepStart = formData.get("sleepStart");
  const sleepEnd = formData.get("sleepEnd");
  if (typeof sleepStart !== "string" || !sleepStart || typeof sleepEnd !== "string" || !sleepEnd) {
    return { error: "Enter both a bedtime and a wake-up time." };
  }

  try {
    await logSleep({ sleepStart, sleepEnd });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to log sleep." };
  }

  revalidatePath("/today");
  return { error: null };
}

export async function deleteSleepLogAction(id: string) {
  await deleteSleepLog(id);
  revalidatePath("/today");
}

export async function startFastAction(targetHours: number | null) {
  await startFast(targetHours);
  revalidatePath("/today");
}

export async function endFastAction(id: string) {
  await endFast(id);
  revalidatePath("/today");
}

export async function cancelFastAction(id: string) {
  await cancelFast(id);
  revalidatePath("/today");
}

export async function logMeditationAction(durationMinutes: number) {
  await logMeditation(durationMinutes);
  revalidatePath("/today");
}

export async function logWorkoutAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const durationRaw = formData.get("durationMinutes");
  const workoutType = formData.get("workoutType");
  const note = formData.get("note");

  try {
    await logTodayWorkout({
      durationMinutes:
        typeof durationRaw === "string" && durationRaw ? Number(durationRaw) : undefined,
      workoutType: typeof workoutType === "string" && workoutType ? workoutType : undefined,
      note: typeof note === "string" && note ? note : undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to log workout." };
  }

  revalidatePath("/today");
  return { error: null };
}

export async function clearTodayWorkoutAction() {
  await clearTodayWorkout();
  revalidatePath("/today");
}
