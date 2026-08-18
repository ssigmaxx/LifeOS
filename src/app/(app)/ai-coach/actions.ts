"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createHabit } from "@/lib/services/habit-service";
import { createGoal } from "@/lib/services/goal-service";
import { habitFormSchema } from "@/lib/validations/habit";
import { goalFormSchema } from "@/lib/validations/goal";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { runAiConversationTurn } from "@/lib/ai/gemini";
import type { GoalProposal, HabitProposal, Proposal } from "@/lib/ai/types";
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
  } catch {
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
