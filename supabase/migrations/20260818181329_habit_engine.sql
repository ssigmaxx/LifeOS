create type public.habit_tracking_type as enum (
  'boolean',
  'numeric',
  'duration',
  'counter',
  'time'
);

create table public.habit_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index habit_categories_user_id_idx on public.habit_categories (user_id);

alter table public.habit_categories enable row level security;

create policy "habit_categories_all_own"
  on public.habit_categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_habit_categories_updated_at
  before update on public.habit_categories
  for each row
  execute function public.set_updated_at();

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.habit_categories (id) on delete set null,
  name text not null,
  description text,
  icon text,
  tracking_type public.habit_tracking_type not null default 'boolean',
  unit text,
  -- Same unit as the value column being compared at log time (see
  -- habit_logs.target_value_snapshot): seconds for duration/time,
  -- the display unit for numeric/counter. Null means "any log counts".
  target_value numeric,
  score_weight numeric not null default 1 check (score_weight >= 0),
  is_active boolean not null default true,
  start_date date not null default current_date,
  end_date date,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habits_end_after_start check (end_date is null or end_date >= start_date)
);

create index habits_user_id_idx on public.habits (user_id);
create index habits_category_id_idx on public.habits (category_id);

alter table public.habits enable row level security;

create policy "habits_all_own"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_habits_updated_at
  before update on public.habits
  for each row
  execute function public.set_updated_at();

-- One row per active weekday; no rows at all means "every day". Historical
-- schedule changes are preserved via effective_from/effective_to instead of
-- mutating existing rows, so past streak calculations stay accurate.
create table public.habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),
  constraint habit_schedules_to_after_from check (effective_to is null or effective_to >= effective_from)
);

create index habit_schedules_habit_id_idx on public.habit_schedules (habit_id);

alter table public.habit_schedules enable row level security;

create policy "habit_schedules_all_own"
  on public.habit_schedules for all
  using (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedules.habit_id
        and habits.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedules.habit_id
        and habits.user_id = auth.uid()
    )
  );

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  value_boolean boolean,
  value_numeric numeric,
  value_seconds integer,
  note text,
  -- Freezes habits.target_value at log time so a later target change never
  -- retroactively changes whether a past day reads as completed.
  target_value_snapshot numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index habit_logs_user_id_log_date_idx on public.habit_logs (user_id, log_date);
create index habit_logs_habit_id_log_date_idx on public.habit_logs (habit_id, log_date);

alter table public.habit_logs enable row level security;

create policy "habit_logs_all_own"
  on public.habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_habit_logs_updated_at
  before update on public.habit_logs
  for each row
  execute function public.set_updated_at();
