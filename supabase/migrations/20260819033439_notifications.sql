-- Notification preferences (one row per user) and Web Push subscriptions.
-- All reminder times are stored as UTC HH:MM (time without time zone) to
-- match the app's existing UTC-based "today" convention. The client
-- converts to/from the user's local time when displaying the settings form.

create table notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,

  habit_reminder_enabled boolean not null default false,
  habit_reminder_time time not null default '20:00',
  habit_reminder_last_sent date,

  water_reminder_enabled boolean not null default false,
  water_reminder_time time not null default '15:00',
  water_reminder_last_sent date,

  journal_reminder_enabled boolean not null default false,
  journal_reminder_time time not null default '21:00',
  journal_reminder_last_sent date,

  morning_briefing_enabled boolean not null default false,
  morning_briefing_time time not null default '07:00',
  morning_briefing_last_sent date,

  evening_review_enabled boolean not null default false,
  evening_review_time time not null default '21:30',
  evening_review_last_sent date,

  updated_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

create policy "Users manage their own notification preferences"
  on notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
