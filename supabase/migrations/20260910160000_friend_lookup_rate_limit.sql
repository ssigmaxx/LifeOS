-- find_user_id_by_email (added in 20260827140000_friends.sql) lets any
-- authenticated user learn whether an arbitrary email has an account here
-- (a non-null return means yes) — a cheap enumeration vector with no limit
-- on how many emails can be probed. This table logs every lookup attempt
-- (successful or not) so sendFriendRequest can rate-limit them, the same
-- Postgres-backed-counter pattern src/lib/ai/rate-limit.ts already uses for
-- the AI Coach.
create table public.friend_lookup_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index friend_lookup_attempts_user_id_attempted_at_idx
  on public.friend_lookup_attempts (user_id, attempted_at desc);

alter table public.friend_lookup_attempts enable row level security;

create policy "friend_lookup_attempts_insert_own"
  on public.friend_lookup_attempts for insert
  with check (auth.uid() = user_id);

create policy "friend_lookup_attempts_select_own"
  on public.friend_lookup_attempts for select
  using (auth.uid() = user_id);
