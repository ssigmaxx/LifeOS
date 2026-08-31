-- Replaces the metric-locked goal model (hit an auto-tracked number
-- daily/weekly/on average) with free-form goals broken into milestones you
-- check off yourself. Progress is now completed/total milestones instead of
-- a formula over historical log data — this drops existing goal rows.

drop table public.goals cascade;
drop type public.goal_metric_type;
drop type public.goal_frequency;

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  target_date date,
  status public.goal_status not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index goal_milestones_goal_id_idx on public.goal_milestones (goal_id, sort_order);

alter table public.goal_milestones enable row level security;

create policy "goal_milestones_all_own"
  on public.goal_milestones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
