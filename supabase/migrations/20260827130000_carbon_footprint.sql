-- Carbon footprint tracking: travel, home energy, and purchases are logged
-- manually; food emissions are derived from the existing food_logs table at
-- read time (see src/lib/carbon/food-factors.ts) and get no table of their
-- own. co2e_kg is nullable on every table here — it's only known once the
-- Climatiq API (see src/lib/carbon/climatiq.ts) has been called, which
-- requires a CLIMATIQ_API_KEY the user may not have configured yet; a null
-- value means "not calculated yet", not zero.

create table public.carbon_travel_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at date not null default current_date,
  mode text not null check (mode in ('car', 'bus', 'train', 'flight', 'bike_walk')),
  distance_km numeric not null check (distance_km > 0),
  co2e_kg numeric check (co2e_kg >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index carbon_travel_logs_user_id_occurred_at_idx on public.carbon_travel_logs (user_id, occurred_at desc);

alter table public.carbon_travel_logs enable row level security;

create policy "carbon_travel_logs_all_own"
  on public.carbon_travel_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.carbon_energy_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at date not null default current_date,
  kind text not null check (kind in ('electricity', 'gas')),
  amount numeric not null check (amount > 0),
  unit text not null default 'kWh',
  co2e_kg numeric check (co2e_kg >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index carbon_energy_logs_user_id_occurred_at_idx on public.carbon_energy_logs (user_id, occurred_at desc);

alter table public.carbon_energy_logs enable row level security;

create policy "carbon_energy_logs_all_own"
  on public.carbon_energy_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.carbon_purchase_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at date not null default current_date,
  category text not null check (category in ('groceries', 'dining_out', 'clothing', 'electronics', 'other')),
  amount numeric not null check (amount > 0),
  currency text not null default 'EUR',
  co2e_kg numeric check (co2e_kg >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index carbon_purchase_logs_user_id_occurred_at_idx on public.carbon_purchase_logs (user_id, occurred_at desc);

alter table public.carbon_purchase_logs enable row level security;

create policy "carbon_purchase_logs_all_own"
  on public.carbon_purchase_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
