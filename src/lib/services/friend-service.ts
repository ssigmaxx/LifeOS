import "server-only";
import { createClient } from "@/lib/supabase/server";
import { calculateStreaks, type StreakResult } from "@/lib/streaks";
import { isLogComplete, type TrackingType } from "@/lib/habit-completion";
import { average, maxOf } from "@/lib/stats";
import { listHabits } from "./habit-service";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export type FriendshipStatus = "pending" | "accepted" | "declined";

export type FriendConnection = {
  friendshipId: string;
  friendId: string;
  friendEmail: string;
  status: FriendshipStatus;
  /** True if the current user sent this request. */
  isRequester: boolean;
  createdAt: string;
};

export async function listFriendConnections(): Promise<FriendConnection[]> {
  const { supabase } = await requireUserId();
  const { data, error } = await supabase.rpc("get_friend_connections");
  if (error) throw error;
  const rows = data as {
    friendship_id: string;
    friend_id: string;
    friend_email: string;
    status: string;
    is_requester: boolean;
    created_at: string;
  }[];
  return rows.map((row) => ({
    friendshipId: row.friendship_id,
    friendId: row.friend_id,
    friendEmail: row.friend_email,
    status: row.status as FriendshipStatus,
    isRequester: row.is_requester,
    createdAt: row.created_at,
  }));
}

export async function sendFriendRequest(email: string): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const { data: friendId, error: lookupError } = await supabase.rpc("find_user_id_by_email", {
    lookup_email: email,
  });
  if (lookupError) throw lookupError;
  if (!friendId) throw new Error("No account found with that email.");
  if (friendId === userId) throw new Error("That's your own email.");

  const { data: existing, error: existingError } = await supabase
    .from("friendships")
    .select("status")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`,
    )
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.status === "accepted") throw new Error("You're already friends.");
  if (existing?.status === "pending") throw new Error("A request is already pending.");

  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: userId, addressee_id: friendId, status: "pending" });
  if (error) throw error;
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", friendshipId);
  if (error) throw error;
}

export async function removeFriendConnection(friendshipId: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

export type FriendHabitLog = {
  logDate: string;
  valueBoolean: boolean | null;
  valueNumeric: number | null;
  valueSeconds: number | null;
  note: string | null;
  completed: boolean;
};

export type FriendHabit = {
  id: string;
  name: string;
  icon: string | null;
  trackingType: TrackingType;
  unit: string | null;
  targetValue: number | null;
  streak: StreakResult;
  logs: FriendHabitLog[];
};

export type FriendSharedHabits = {
  friendId: string;
  friendEmail: string;
  habits: FriendHabit[];
};

export async function getFriendsSharedHabits(): Promise<FriendSharedHabits[]> {
  const { supabase } = await requireUserId();
  const connections = await listFriendConnections();
  const friends = connections.filter((c) => c.status === "accepted");
  if (friends.length === 0) return [];

  const friendIds = friends.map((f) => f.friendId);

  const { data: habitRows, error: habitsError } = await supabase
    .from("habits")
    .select("id, user_id, name, icon, tracking_type, unit, target_value, start_date")
    .in("user_id", friendIds)
    .eq("shared_with_friends", true)
    .order("sort_order");
  if (habitsError) throw habitsError;

  const habitIds = habitRows.map((h) => h.id);
  const [{ data: scheduleRows, error: scheduleError }, { data: logRows, error: logError }] =
    habitIds.length === 0
      ? [{ data: [], error: null }, { data: [], error: null }]
      : await Promise.all([
          supabase
            .from("habit_schedules")
            .select("habit_id, weekday")
            .in("habit_id", habitIds)
            .is("effective_to", null),
          supabase
            .from("habit_logs")
            .select("habit_id, log_date, value_boolean, value_numeric, value_seconds, note, target_value_snapshot")
            .in("habit_id", habitIds)
            .order("log_date", { ascending: false }),
        ]);
  if (scheduleError) throw scheduleError;
  if (logError) throw logError;

  const scheduleByHabit = new Map<string, number[]>();
  for (const row of scheduleRows) {
    const list = scheduleByHabit.get(row.habit_id) ?? [];
    list.push(row.weekday);
    scheduleByHabit.set(row.habit_id, list);
  }

  const logsByHabit = new Map<string, typeof logRows>();
  for (const row of logRows) {
    const list = logsByHabit.get(row.habit_id) ?? [];
    list.push(row);
    logsByHabit.set(row.habit_id, list);
  }

  const today = todayISO();

  const habitsByFriend = new Map<string, FriendHabit[]>();
  for (const row of habitRows) {
    const trackingType = row.tracking_type as TrackingType;
    const rawLogs = logsByHabit.get(row.id) ?? [];

    const streak = calculateStreaks({
      logs: rawLogs.map((log) => ({
        logDate: log.log_date,
        completed: isLogComplete(trackingType, {
          valueBoolean: log.value_boolean,
          valueNumeric: log.value_numeric,
          valueSeconds: log.value_seconds,
          targetValueSnapshot: log.target_value_snapshot,
        }),
      })),
      scheduleWeekdays: scheduleByHabit.get(row.id) ?? [],
      startDate: row.start_date,
      today,
    });

    const habit: FriendHabit = {
      id: row.id,
      name: row.name,
      icon: row.icon,
      trackingType,
      unit: row.unit,
      targetValue: row.target_value,
      streak,
      logs: rawLogs.map((log) => ({
        logDate: log.log_date,
        valueBoolean: log.value_boolean,
        valueNumeric: log.value_numeric,
        valueSeconds: log.value_seconds,
        note: log.note,
        completed: isLogComplete(trackingType, {
          valueBoolean: log.value_boolean,
          valueNumeric: log.value_numeric,
          valueSeconds: log.value_seconds,
          targetValueSnapshot: log.target_value_snapshot,
        }),
      })),
    };

    const list = habitsByFriend.get(row.user_id) ?? [];
    list.push(habit);
    habitsByFriend.set(row.user_id, list);
  }

  return friends.map((f) => ({
    friendId: f.friendId,
    friendEmail: f.friendEmail,
    habits: habitsByFriend.get(f.friendId) ?? [],
  }));
}

export type LeaderboardEntry = {
  id: string;
  label: string;
  isSelf: boolean;
  /** Average completion rate across shared habits, 0-1. Null means they
   * (or you) haven't shared any habits yet — excluded from ranking, not
   * shown as a misleading 0%. */
  avgCompletionRate: number | null;
  bestStreak: number;
  sharedHabitCount: number;
};

// Ranks only on shared habits — friends never see anything you haven't
// explicitly marked shared_with_friends, so the leaderboard can't lean on
// private data either. Reuses the same streak/completion math
// getFriendsSharedHabits() and listHabits() already compute.
export async function getFriendsLeaderboard(): Promise<LeaderboardEntry[]> {
  const { userId } = await requireUserId();
  const [sharedByFriend, ownHabits] = await Promise.all([getFriendsSharedHabits(), listHabits()]);

  const entries: LeaderboardEntry[] = sharedByFriend.map((f) => ({
    id: f.friendId,
    label: f.friendEmail,
    isSelf: false,
    avgCompletionRate: average(f.habits.map((h) => h.streak.completionRate)),
    bestStreak: maxOf(f.habits.map((h) => h.streak.currentStreak)) ?? 0,
    sharedHabitCount: f.habits.length,
  }));

  const ownShared = ownHabits.filter((h) => h.sharedWithFriends);
  entries.push({
    id: userId,
    label: "You",
    isSelf: true,
    avgCompletionRate: average(ownShared.map((h) => h.streak.completionRate)),
    bestStreak: maxOf(ownShared.map((h) => h.streak.currentStreak)) ?? 0,
    sharedHabitCount: ownShared.length,
  });

  return entries.sort((a, b) => {
    if (a.avgCompletionRate == null && b.avgCompletionRate == null) return 0;
    if (a.avgCompletionRate == null) return 1;
    if (b.avgCompletionRate == null) return -1;
    return b.avgCompletionRate - a.avgCompletionRate;
  });
}
