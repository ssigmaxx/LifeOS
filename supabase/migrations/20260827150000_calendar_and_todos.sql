-- Calendar events (manual + .ics import) and a to-do list. Standard
-- single-owner tables — no cross-user sharing involved here, unlike
-- friendships/habits.

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);

create index calendars_user_id_idx on public.calendars (user_id);

alter table public.calendars enable row level security;

create policy "calendars_all_own"
  on public.calendars for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Weekly-recurring imports are materialized as individual rows (see
-- src/lib/ics.ts's expandWeeklyRecurrence) rather than stored as a live
-- RRULE, so the Calendar grid can query a date range with a plain
-- start_at/end_at filter. recurrence_group_id links occurrences from the
-- same source VEVENT for display purposes only — v1 deletes one occurrence
-- at a time.
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  is_all_day boolean not null default false,
  recurrence_group_id uuid,
  created_at timestamptz not null default now()
);

create index calendar_events_user_id_start_at_idx on public.calendar_events (user_id, start_at);
create index calendar_events_calendar_id_idx on public.calendar_events (calendar_id);

alter table public.calendar_events enable row level security;

create policy "calendar_events_all_own"
  on public.calendar_events for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.calendars
      where calendars.id = calendar_events.calendar_id
        and calendars.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.calendars
      where calendars.id = calendar_events.calendar_id
        and calendars.user_id = auth.uid()
    )
  );

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todos_user_id_due_date_idx on public.todos (user_id, due_date);

alter table public.todos enable row level security;

create policy "todos_all_own"
  on public.todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_todos_updated_at
  before update on public.todos
  for each row
  execute function public.set_updated_at();
