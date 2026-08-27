"use server";

import { revalidatePath } from "next/cache";
import { energyLogInputSchema, purchaseLogInputSchema, travelLogInputSchema } from "@/lib/validations/carbon";
import {
  deleteEnergyLog,
  deletePurchaseLog,
  deleteTravelLog,
  logEnergy,
  logPurchase,
  logTravel,
} from "@/lib/services/carbon-service";

export type FormActionState = { error: string | null };

export async function logTravelAction(input: unknown): Promise<FormActionState> {
  const parsed = travelLogInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid travel entry." };
  }
  try {
    await logTravel(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to log travel." };
  }
  revalidatePath("/carbon");
  revalidatePath("/today");
  return { error: null };
}

export async function logEnergyAction(input: unknown): Promise<FormActionState> {
  const parsed = energyLogInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid energy entry." };
  }
  try {
    await logEnergy(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to log energy usage." };
  }
  revalidatePath("/carbon");
  revalidatePath("/today");
  return { error: null };
}

export async function logPurchaseAction(input: unknown): Promise<FormActionState> {
  const parsed = purchaseLogInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid purchase entry." };
  }
  try {
    await logPurchase(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to log purchase." };
  }
  revalidatePath("/carbon");
  revalidatePath("/today");
  return { error: null };
}

export async function deleteCarbonEntryAction(category: "travel" | "energy" | "shopping", id: string) {
  if (category === "travel") await deleteTravelLog(id);
  else if (category === "energy") await deleteEnergyLog(id);
  else await deletePurchaseLog(id);
  revalidatePath("/carbon");
  revalidatePath("/today");
}
