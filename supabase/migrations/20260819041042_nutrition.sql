-- One row per user: the inputs behind their calorie target plus the
-- computed BMR/TDEE/target itself, so the target is stable day-to-day
-- rather than silently recalculated (and potentially drifting) on every
-- read. Recomputed only when the user updates their profile.
create table public.nutrition_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  age smallint not null check (age between 10 and 120),
  sex text not null check (sex in ('male', 'female')),
  height_cm numeric not null check (height_cm > 0),
  weight_kg numeric not null check (weight_kg > 0),
  activity_level text not null check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  goal text not null check (goal in ('lose', 'maintain', 'gain')),
  -- Total desired change in kg (always positive; direction comes from
  -- `goal`) and the timeframe to reach it. Null when goal = 'maintain'.
  target_weight_change_kg numeric check (target_weight_change_kg > 0),
  timeframe_weeks smallint check (timeframe_weeks > 0),
  bmr numeric not null,
  tdee numeric not null,
  daily_calorie_target integer not null check (daily_calorie_target > 0),
  protein_target_g numeric not null check (protein_target_g >= 0),
  carbs_target_g numeric not null check (carbs_target_g >= 0),
  fat_target_g numeric not null check (fat_target_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nutrition_profiles enable row level security;

create policy "nutrition_profiles_all_own"
  on public.nutrition_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_nutrition_profiles_updated_at
  before update on public.nutrition_profiles
  for each row
  execute function public.set_updated_at();

-- source = 'open_food_facts' means the macros came from a real matched
-- product; 'estimate' means no exact match was found and the values are a
-- best-effort approximation (model-estimated or a close equivalent) —
-- is_estimate is redundant with source today but kept as its own column
-- since a future real BLS/generic-food database match would be
-- source-but-not-estimate, same shape as open_food_facts.
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null,
  source text not null check (source in ('open_food_facts', 'estimate')),
  quantity_grams numeric not null check (quantity_grams > 0),
  calories numeric not null check (calories >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  is_estimate boolean not null default false,
  created_at timestamptz not null default now()
);

create index food_logs_user_id_log_date_idx on public.food_logs (user_id, log_date);

alter table public.food_logs enable row level security;

create policy "food_logs_all_own"
  on public.food_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
