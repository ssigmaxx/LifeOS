import "server-only";
import type { Content } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const HISTORY_LIMIT = 20;

export async function getOrCreateConversation(conversationId: string | null): Promise<string> {
  const { supabase, userId } = await requireUserId();

  if (conversationId) {
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Recent turns as Gemini `Content[]` — 'assistant' maps to Gemini's 'model'. */
export async function getConversationHistoryForModel(conversationId: string): Promise<Content[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("ai_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;

  return data
    .reverse()
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    createdAt: m.created_at,
  }));
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  toolCalls?: { name: string; args: unknown }[],
): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
    tool_calls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
  });
  if (error) throw error;
}

export async function getLatestConversationId(): Promise<string | null> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
