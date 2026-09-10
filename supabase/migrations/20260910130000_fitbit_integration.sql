-- Stores the Google Health API OAuth tokens used to pull Fitbit/Pixel Watch
-- data (steps, heart rate, sleep) into Meridian. One connection per user —
-- server-only access via service functions, never read client-side.
create table fitbit_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  scope text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fitbit_connections enable row level security;

create policy "Users manage their own fitbit connection"
  on fitbit_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
