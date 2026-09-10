-- Daily health summaries synced in from the Google Health API (Fitbit/Pixel
-- Watch). One row per user per day. Written only by the cron sync job (via
-- the admin/service-role client, bypassing RLS) — the policy below only
-- needs to cover reads from the user's own session.
create table health_daily_metrics (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  steps integer,
  resting_heart_rate integer,
  sleep_minutes integer,
  -- Raw provider response, kept for the metrics whose exact field shape
  -- wasn't confirmed at write time — lets the parsing in fitbit-sync-service
  -- be corrected later without needing another round-trip to Google.
  raw jsonb,
  synced_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table health_daily_metrics enable row level security;

create policy "Users read their own health metrics"
  on health_daily_metrics for select
  using (auth.uid() = user_id);
