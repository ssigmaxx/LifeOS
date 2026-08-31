-- Widens carbon_purchase_logs' categories from a carbon-only "Shopping"
-- list to a real expense taxonomy (rent, transport, health, entertainment),
-- since it's now doing double duty as the Budget feature's expense log too
-- — one log, one row, both a dollar amount and a CO2e figure already on it.

alter table public.carbon_purchase_logs
  drop constraint carbon_purchase_logs_category_check;

alter table public.carbon_purchase_logs
  add constraint carbon_purchase_logs_category_check
  check (category in (
    'groceries', 'dining_out', 'clothing', 'electronics',
    'transport', 'housing', 'entertainment', 'health', 'other'
  ));

-- One budget per category per user ('overall' is a pseudo-category for a
-- single whole-month cap rather than per-category ones) — upserted on
-- (user_id, category), same pattern as nutrition_profiles/saved_foods.
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in (
    'overall', 'groceries', 'dining_out', 'clothing', 'electronics',
    'transport', 'housing', 'entertainment', 'health', 'other'
  )),
  amount numeric not null check (amount > 0),
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

alter table public.budgets enable row level security;

create policy "budgets_all_own"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_budgets_updated_at
  before update on public.budgets
  for each row
  execute function public.set_updated_at();
