-- Opt-in cycle tracking: off by default for every existing and new profile.
-- The app only shows the feature (nav item + page) once a user turns this
-- on themselves in Settings — nobody is asked to declare anything about
-- themselves to use the rest of the app.
alter table public.profiles
  add column cycle_tracking_enabled boolean not null default false;

create table public.cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  -- null = no period that day; otherwise how heavy it was.
  period_flow text check (period_flow in ('spotting', 'light', 'medium', 'heavy')),
  -- null = not applicable / not answered that day, distinct from false ("skipped it").
  pill_taken boolean,
  mood smallint check (mood between 1 and 5),
  pain_level smallint check (pain_level between 0 and 5),
  symptoms text[] not null default '{}',
  -- Free-form catch-all for anything the structured fields above don't cover.
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index cycle_logs_user_id_log_date_idx on public.cycle_logs (user_id, log_date);

alter table public.cycle_logs enable row level security;

create policy "cycle_logs_all_own"
  on public.cycle_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_cycle_logs_updated_at
  before update on public.cycle_logs
  for each row
  execute function public.set_updated_at();
