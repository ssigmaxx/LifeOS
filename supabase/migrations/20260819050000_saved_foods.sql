-- Quick re-log for foods the user eats often. One row per distinct food
-- name per user (upserted on save, not appended), storing the per-100g
-- macros plus the last-used quantity/meal as defaults so a saved food can
-- be logged in one click without re-entering anything.
create table public.saved_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_name text not null,
  source text not null check (source in ('open_food_facts', 'estimate')),
  calories_per_100g numeric not null check (calories_per_100g >= 0),
  protein_per_100g numeric not null check (protein_per_100g >= 0),
  carbs_per_100g numeric not null check (carbs_per_100g >= 0),
  fat_per_100g numeric not null check (fat_per_100g >= 0),
  default_quantity_grams numeric not null check (default_quantity_grams > 0),
  default_meal_type text not null check (default_meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, food_name)
);

alter table public.saved_foods enable row level security;

create policy "saved_foods_all_own"
  on public.saved_foods for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_saved_foods_updated_at
  before update on public.saved_foods
  for each row
  execute function public.set_updated_at();
