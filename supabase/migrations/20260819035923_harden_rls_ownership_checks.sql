-- habit_logs and ai_messages both carry their own user_id (so RLS already
-- prevents other users from ever reading them), but their policies never
-- verified that the *referenced* parent row (habit_id / conversation_id)
-- is actually owned by that same user — unlike habit_schedules, which
-- already gets this right via an EXISTS check. Without it, a user could
-- insert a row against another user's habit/conversation id (still owned
-- by themselves per user_id), which can't leak data across the boundary
-- but can collide with a unique constraint (habit_logs.habit_id+log_date)
-- and block the real owner from logging that day — a narrow griefing
-- vector, closed here for defense in depth.

drop policy "habit_logs_all_own" on public.habit_logs;

create policy "habit_logs_all_own"
  on public.habit_logs for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.habits
      where habits.id = habit_logs.habit_id
        and habits.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.habits
      where habits.id = habit_logs.habit_id
        and habits.user_id = auth.uid()
    )
  );

drop policy "ai_messages_all_own" on public.ai_messages;

create policy "ai_messages_all_own"
  on public.ai_messages for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.ai_conversations
      where ai_conversations.id = ai_messages.conversation_id
        and ai_conversations.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ai_conversations
      where ai_conversations.id = ai_messages.conversation_id
        and ai_conversations.user_id = auth.uid()
    )
  );
