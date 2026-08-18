-- Reusable trigger function: keeps updated_at current on every row update.
-- Every future table with an updated_at column reuses this.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- One row per authenticated user, keyed to auth.users so it can never be
-- created for/by anyone other than the owning account.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'UTC',
  week_start_day smallint not null default 1 check (week_start_day between 0 and 6),
  units_water text not null default 'ml' check (units_water in ('ml', 'l', 'oz')),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policies: rows are created only by the trigger below
-- (as the definer) and removed only via the auth.users cascade.

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Auto-create a profile row the moment a new auth user is created, so the
-- app never has to handle a "user exists but has no profile" state.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
