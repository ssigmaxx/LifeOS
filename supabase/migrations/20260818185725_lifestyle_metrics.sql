alter table public.profiles
  add column water_daily_target_ml integer not null default 3000 check (water_daily_target_ml > 0);

create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sleep_start timestamptz not null,
  sleep_end timestamptz not null,
  duration_minutes integer not null,
  quality smallint check (quality between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sleep_logs_end_after_start check (sleep_end > sleep_start)
);

create index sleep_logs_user_id_sleep_start_idx on public.sleep_logs (user_id, sleep_start desc);

alter table public.sleep_logs enable row level security;

create policy "sleep_logs_all_own"
  on public.sleep_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_sleep_logs_updated_at
  before update on public.sleep_logs
  for each row
  execute function public.set_updated_at();

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  amount_ml integer not null check (amount_ml > 0),
  created_at timestamptz not null default now()
);

create index water_logs_user_id_logged_at_idx on public.water_logs (user_id, logged_at desc);

alter table public.water_logs enable row level security;

create policy "water_logs_all_own"
  on public.water_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.fasting_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  target_hours numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fasting_sessions_end_after_start check (end_time is null or end_time > start_time)
);

create index fasting_sessions_user_id_start_time_idx on public.fasting_sessions (user_id, start_time desc);

-- At most one ongoing (end_time is null) fast per user at a time.
create unique index fasting_sessions_one_ongoing_per_user
  on public.fasting_sessions (user_id)
  where (end_time is null);

alter table public.fasting_sessions enable row level security;

create policy "fasting_sessions_all_own"
  on public.fasting_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_fasting_sessions_updated_at
  before update on public.fasting_sessions
  for each row
  execute function public.set_updated_at();

create table public.meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_date date not null default current_date,
  duration_minutes integer not null check (duration_minutes > 0),
  note text,
  created_at timestamptz not null default now()
);

create index meditation_sessions_user_id_session_date_idx on public.meditation_sessions (user_id, session_date desc);

alter table public.meditation_sessions enable row level security;

create policy "meditation_sessions_all_own"
  on public.meditation_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One row per day, similar to habit_logs: today's gym status is a single
-- fact, not an append-only stream. Future exercise/set/rep detail (see
-- spec section 30) would live in a separate child table referencing this.
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_date date not null default current_date,
  completed boolean not null default true,
  duration_minutes integer check (duration_minutes > 0),
  workout_type text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workout_date)
);

create index workout_logs_user_id_workout_date_idx on public.workout_logs (user_id, workout_date desc);

alter table public.workout_logs enable row level security;

create policy "workout_logs_all_own"
  on public.workout_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_workout_logs_updated_at
  before update on public.workout_logs
  for each row
  execute function public.set_updated_at();
