"use server";

import { revalidatePath } from "next/cache";
import { deleteCycleLog, setCycleTrackingEnabled, upsertCycleLog } from "@/lib/services/cycle-service";
import { cycleLogFormSchema } from "@/lib/validations/cycle";

export type FormActionState = { error: string | null };

export async function saveCycleLogAction(
  date: string,
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = cycleLogFormSchema.safeParse({
    periodFlow: formData.get("periodFlow"),
    pillTaken: formData.get("pillTaken"),
    mood: formData.get("mood"),
    painLevel: formData.get("painLevel"),
    symptoms: formData.getAll("symptoms"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await upsertCycleLog(date, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save." };
  }

  revalidatePath("/cycle");
  return { error: null };
}

export async function deleteCycleLogAction(date: string) {
  await deleteCycleLog(date);
  revalidatePath("/cycle");
}

export async function setCycleTrackingEnabledAction(enabled: boolean) {
  await setCycleTrackingEnabled(enabled);
  revalidatePath("/settings");
  revalidatePath("/cycle");
  revalidatePath("/", "layout");
}
