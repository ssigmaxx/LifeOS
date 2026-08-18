"use server";

import { revalidatePath } from "next/cache";
import {
  deleteJournalEntry,
  upsertEveningEntry,
  upsertMorningEntry,
} from "@/lib/services/journal-service";
import { eveningEntrySchema, morningEntrySchema } from "@/lib/validations/journal";

export type FormActionState = { error: string | null };

function revalidateJournalPaths() {
  revalidatePath("/today");
  revalidatePath("/journal");
}

export async function logMorningEntryAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const entryDate = formData.get("entryDate");
  if (typeof entryDate !== "string" || !entryDate) {
    return { error: "Missing date." };
  }

  const parsed = morningEntrySchema.safeParse({
    mood: formData.get("mood"),
    text: formData.get("text"),
    intention: formData.get("intention"),
    goals: formData.get("goals"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await upsertMorningEntry(entryDate, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save entry." };
  }

  revalidateJournalPaths();
  return { error: null };
}

export async function logEveningEntryAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const entryDate = formData.get("entryDate");
  if (typeof entryDate !== "string" || !entryDate) {
    return { error: "Missing date." };
  }

  const parsed = eveningEntrySchema.safeParse({
    mood: formData.get("mood"),
    text: formData.get("text"),
    wentWell: formData.get("wentWell"),
    couldImprove: formData.get("couldImprove"),
    gratitude: formData.get("gratitude"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await upsertEveningEntry(entryDate, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save entry." };
  }

  revalidateJournalPaths();
  return { error: null };
}

export async function deleteJournalEntryAction(id: string) {
  await deleteJournalEntry(id);
  revalidateJournalPaths();
}
