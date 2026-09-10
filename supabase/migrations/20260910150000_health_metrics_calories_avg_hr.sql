-- Adds calories burned (total-calories data type) and average heart rate
-- (previously only the daily minimum, used as the resting-HR proxy, was
-- stored) to the existing per-day health sync.
alter table public.health_daily_metrics
  add column calories_burned integer,
  add column avg_heart_rate integer;
