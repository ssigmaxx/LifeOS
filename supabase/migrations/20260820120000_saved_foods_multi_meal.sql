-- A saved food can now default to more than one meal (e.g. the same
-- yogurt logged as both breakfast and a evening snack) — swap the single
-- default_meal_type for an array of default meals, each still a quick
-- one-click log target.
alter table public.saved_foods add column default_meal_types text[];

update public.saved_foods set default_meal_types = array[default_meal_type];

alter table public.saved_foods
  alter column default_meal_types set not null,
  add constraint saved_foods_default_meal_types_check check (
    default_meal_types <@ array['breakfast', 'lunch', 'dinner', 'snack']::text[]
    and array_length(default_meal_types, 1) > 0
  );

alter table public.saved_foods drop column default_meal_type;
