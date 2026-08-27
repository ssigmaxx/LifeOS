-- Friend connections + habit sharing. This is the app's first cross-user
-- feature — every other table is strictly private (auth.uid() = user_id).
-- The security model here is entirely RLS-driven: a friend's shared habit
-- data is readable through the normal client, with Postgres as the sole
-- source of truth for who can see what. Nothing in the app layer does its
-- own can-they-see-this checks.

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

create index friendships_requester_id_idx on public.friendships (requester_id);
create index friendships_addressee_id_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

-- Unlike every other table so far, requester and addressee can do
-- different things, so this needs one policy per command rather than a
-- single "for all".

create policy "friendships_select_involved"
  on public.friendships for select
  using (auth.uid() in (requester_id, addressee_id));

create policy "friendships_insert_as_requester"
  on public.friendships for insert
  with check (auth.uid() = requester_id and status = 'pending');

-- Only the addressee can accept/decline — a requester changing their own
-- request's status would let them self-approve a friendship.
create policy "friendships_update_as_addressee"
  on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

-- Either side can remove a connection or cancel/decline via delete.
create policy "friendships_delete_involved"
  on public.friendships for delete
  using (auth.uid() in (requester_id, addressee_id));

create trigger set_friendships_updated_at
  before update on public.friendships
  for each row
  execute function public.set_updated_at();

-- Per-habit sharing toggle — the entire "sharing scope" model per the
-- product decision (visible to all friends, no per-friend permissions).
alter table public.habits
  add column shared_with_friends boolean not null default false;

-- Additive read-only policies for friends. Postgres OR's permissive
-- policies together, so these only ever *add* access on top of the
-- existing owner-only "for all" policies below — an owner's own access is
-- unaffected.

create policy "habits_select_shared_by_friends"
  on public.habits for select
  using (
    shared_with_friends = true
    and exists (
      select 1 from public.friendships
      where status = 'accepted'
        and ((requester_id = auth.uid() and addressee_id = habits.user_id)
          or (addressee_id = auth.uid() and requester_id = habits.user_id))
    )
  );

create policy "habit_schedules_select_shared_by_friends"
  on public.habit_schedules for select
  using (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedules.habit_id
        and habits.shared_with_friends = true
        and exists (
          select 1 from public.friendships
          where status = 'accepted'
            and ((requester_id = auth.uid() and addressee_id = habits.user_id)
              or (addressee_id = auth.uid() and requester_id = habits.user_id))
        )
    )
  );

create policy "habit_logs_select_shared_by_friends"
  on public.habit_logs for select
  using (
    exists (
      select 1 from public.habits
      where habits.id = habit_logs.habit_id
        and habits.shared_with_friends = true
        and exists (
          select 1 from public.friendships
          where status = 'accepted'
            and ((requester_id = auth.uid() and addressee_id = habits.user_id)
              or (addressee_id = auth.uid() and requester_id = habits.user_id))
        )
    )
  );

-- Resolves an email to a user id when sending a friend request. Returns
-- null on no match rather than raising, so the caller can show a normal
-- "no account found" message instead of an error. security definer is
-- required because auth.users isn't otherwise queryable across accounts —
-- same pattern as handle_new_user in 20260818175802_init_profiles.sql.
create or replace function public.find_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select id from auth.users where email = lookup_email limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to authenticated;

-- Returns the other party's email for every friendship row the caller is
-- part of (pending or accepted, either direction) — never a general
-- "look up anyone's email" capability, only for people already connected
-- or requested.
create or replace function public.get_friend_connections()
returns table (
  friendship_id uuid,
  friend_id uuid,
  friend_email text,
  status text,
  is_requester boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    f.id,
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end,
    u.email,
    f.status,
    f.requester_id = auth.uid(),
    f.created_at
  from public.friendships f
  join auth.users u
    on u.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id);
$$;

revoke all on function public.get_friend_connections() from public;
grant execute on function public.get_friend_connections() to authenticated;
