-- Saved foods can now remember a different portion size per meal (e.g.
-- 150g at breakfast but 250g at dinner) instead of one quantity shared
-- across every default meal. Replaces default_meal_types + the single
-- default_quantity_grams with meal_defaults: a jsonb array of
-- {mealType, quantityGrams} pairs, one per quick-add button.
alter table public.saved_foods add column meal_defaults jsonb;

update public.saved_foods sf
set meal_defaults = (
  select jsonb_agg(jsonb_build_object('mealType', meal, 'quantityGrams', sf.default_quantity_grams))
  from unnest(sf.default_meal_types) as meal
);

alter table public.saved_foods
  alter column meal_defaults set not null,
  add constraint saved_foods_meal_defaults_check check (
    jsonb_typeof(meal_defaults) = 'array' and jsonb_array_length(meal_defaults) > 0
  );

alter table public.saved_foods drop column default_meal_types;
alter table public.saved_foods drop column default_quantity_grams;
