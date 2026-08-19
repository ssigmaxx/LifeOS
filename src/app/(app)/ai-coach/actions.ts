"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createHabit } from "@/lib/services/habit-service";
import { createGoal } from "@/lib/services/goal-service";
import { habitFormSchema } from "@/lib/validations/habit";
import { goalFormSchema } from "@/lib/validations/goal";
import { nutritionProfileInputSchema, mealLogConfirmSchema } from "@/lib/validations/nutrition";
import { buildNutritionPlan } from "@/lib/nutrition-calc";
import { logMeal, upsertNutritionProfile } from "@/lib/services/nutrition-service";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { runAiConversationTurn } from "@/lib/ai/gemini";
import type { GoalProposal, HabitProposal, MealLogProposal, NutritionProfileProposal, Proposal } from "@/lib/ai/types";
import {
  getConversationHistoryForModel,
  getOrCreateConversation,
  saveMessage,
} from "@/lib/services/ai-service";

export type ConfirmActionState = { error: string | null };

const MAX_MESSAGE_LENGTH = 4000;

export type SendMessageResult = {
  conversationId: string;
  text: string;
  proposals: Proposal[];
  error: string | null;
};

export async function sendMessageAction(
  conversationId: string | null,
  message: string,
): Promise<SendMessageResult> {
  const trimmed = message.trim();
  const emptyResult: SendMessageResult = {
    conversationId: conversationId ?? "",
    text: "",
    proposals: [],
    error: null,
  };

  if (!trimmed) return { ...emptyResult, error: "Message can't be empty." };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ...emptyResult, error: "That message is too long." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...emptyResult, error: "Not authenticated." };

  if (process.env.AI_ENABLED !== "true") {
    return {
      ...emptyResult,
      error: "AI Coach is temporarily unavailable. Your tracking data is safe and the rest of LifeOS is still available.",
    };
  }

  const rateLimit = await checkAiRateLimit(user.id);
  if (!rateLimit.allowed) {
    return { ...emptyResult, error: rateLimit.reason };
  }

  const convoId = await getOrCreateConversation(conversationId);
  const history = await getConversationHistoryForModel(convoId);

  let turn;
  try {
    turn = await runAiConversationTurn(history, trimmed);
  } catch (err) {
    console.error("[ai-coach] runAiConversationTurn failed:", err);
    return {
      conversationId: convoId,
      text: "",
      proposals: [],
      error: "AI Coach is temporarily unavailable. Your tracking data is safe and the rest of LifeOS is still available.",
    };
  }

  await saveMessage(convoId, "user", trimmed);
  await saveMessage(convoId, "assistant", turn.text, turn.toolCallsAudit);
  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", convoId);

  revalidatePath("/ai-coach");
  return { conversationId: convoId, text: turn.text, proposals: turn.proposals, error: null };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// The AI's proposal already passed through this same schema once when it
// was drafted (see tools.ts), but the client could tamper with the object
// before confirming — re-validate here rather than trusting it blindly.
export async function confirmHabitProposalAction(proposal: HabitProposal): Promise<ConfirmActionState> {
  const parsed = habitFormSchema.safeParse({
    name: proposal.name,
    description: proposal.description,
    trackingType: proposal.trackingType,
    unit: proposal.unit,
    targetValue: proposal.targetValue,
    scoreWeight: 1,
    startDate: todayISO(),
    frequency: proposal.frequency,
    weekdays: proposal.weekdays,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid habit proposal." };
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

export async function confirmGoalProposalAction(proposal: GoalProposal): Promise<ConfirmActionState> {
  const parsed = goalFormSchema.safeParse({
    name: proposal.name,
    description: proposal.description,
    metricType: proposal.metricType,
    targetValue: proposal.targetValue,
    frequency: proposal.frequency,
    startDate: todayISO(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid goal proposal." };
  }

  try {
    await createGoal(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create goal." };
  }

  revalidatePath("/goals");
  return { error: null };
}

// Recomputes the plan from the proposal's raw inputs rather than trusting
// its precomputed BMI/BMR/TDEE/target fields — the client could tamper
// with those without touching the inputs they were derived from.
export async function confirmNutritionProfileAction(
  proposal: NutritionProfileProposal,
): Promise<ConfirmActionState> {
  const parsed = nutritionProfileInputSchema.safeParse({
    age: proposal.age,
    sex: proposal.sex,
    heightCm: proposal.heightCm,
    weightKg: proposal.weightKg,
    activityLevel: proposal.activityLevel,
    goal: proposal.goal,
    targetWeightChangeKg: proposal.targetWeightChangeKg,
    timeframeWeeks: proposal.timeframeWeeks,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid nutrition profile." };
  }

  const plan = buildNutritionPlan(parsed.data);

  try {
    await upsertNutritionProfile({
      age: parsed.data.age,
      sex: parsed.data.sex,
      heightCm: parsed.data.heightCm,
      weightKg: parsed.data.weightKg,
      activityLevel: parsed.data.activityLevel,
      goal: parsed.data.goal,
      targetWeightChangeKg: parsed.data.targetWeightChangeKg ?? null,
      timeframeWeeks: parsed.data.timeframeWeeks ?? null,
      bmr: plan.bmr,
      tdee: plan.tdee,
      dailyCalorieTarget: plan.dailyCalorieTarget,
      proteinTargetG: plan.macroTargets.proteinG,
      carbsTargetG: plan.macroTargets.carbsG,
      fatTargetG: plan.macroTargets.fatG,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save nutrition profile." };
  }

  revalidatePath("/nutrition");
  revalidatePath("/today");
  return { error: null };
}

export async function confirmMealLogAction(proposal: MealLogProposal): Promise<ConfirmActionState> {
  const parsed = mealLogConfirmSchema.safeParse({
    mealType: proposal.mealType,
    foodName: proposal.foodName,
    source: proposal.source,
    quantityGrams: proposal.quantityGrams,
    calories: proposal.calories,
    proteinG: proposal.proteinG,
    carbsG: proposal.carbsG,
    fatG: proposal.fatG,
    isEstimate: proposal.isEstimate,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid meal log." };
  }

  try {
    await logMeal(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to log meal." };
  }

  revalidatePath("/nutrition");
  revalidatePath("/today");
  return { error: null };
}
