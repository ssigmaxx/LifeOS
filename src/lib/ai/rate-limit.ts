import "server-only";
import { createClient } from "@/lib/supabase/server";

const MAX_PER_MINUTE = Number(process.env.AI_MAX_REQUESTS_PER_MINUTE ?? "5");
const MAX_PER_DAY = Number(process.env.AI_MAX_REQUESTS_PER_DAY ?? "200");

export type RateLimitResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Simple Postgres-backed rate limit — counts the user's own past `user`
 * turns in ai_messages. No Redis/distributed infra; fine at this scale
 * and avoids adding infrastructure the rest of the app doesn't need.
 */
export async function checkAiRateLimit(userId: string): Promise<RateLimitResult> {
  const supabase = await createClient();

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [{ count: minuteCount, error: minuteError }, { count: dayCount, error: dayError }] =
    await Promise.all([
      supabase
        .from("ai_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("role", "user")
        .gte("created_at", oneMinuteAgo),
      supabase
        .from("ai_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("role", "user")
        .gte("created_at", startOfDay.toISOString()),
    ]);
  if (minuteError) throw minuteError;
  if (dayError) throw dayError;

  if ((minuteCount ?? 0) >= MAX_PER_MINUTE) {
    return { allowed: false, reason: "You're sending messages faster than I can keep up. Try again in a minute." };
  }
  if ((dayCount ?? 0) >= MAX_PER_DAY) {
    return { allowed: false, reason: "You've reached today's AI Coach limit. It resets tomorrow." };
  }
  return { allowed: true };
}
