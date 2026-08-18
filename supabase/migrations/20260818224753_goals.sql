create type public.goal_metric_type as enum (
  'water_ml',
  'meditation_minutes',
  'gym_sessions',
  'sleep_hours',
  'fasting_hours'
);

-- How target_value is evaluated: 'daily' = must hit the target every day
-- (e.g. 3000ml water), 'weekly' = count of qualifying days in the current
-- week (e.g. 5 gym sessions/week), 'average' = rolling average since
-- start_date (e.g. average 7.5h sleep).
create type public.goal_frequency as enum ('daily', 'weekly', 'average');

create type public.goal_status as enum ('active', 'completed', 'abandoned');

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  metric_type public.goal_metric_type not null,
  target_value numeric not null check (target_value > 0),
  frequency public.goal_frequency not null default 'daily',
  start_date date not null default current_date,
  end_date date,
  status public.goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_end_after_start check (end_date is null or end_date >= start_date)
);

create index goals_user_id_idx on public.goals (user_id);

alter table public.goals enable row level security;

create policy "goals_all_own"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_goals_updated_at
  before update on public.goals
  for each row
  execute function public.set_updated_at();
