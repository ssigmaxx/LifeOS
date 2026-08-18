create type public.journal_entry_type as enum ('morning', 'evening');

-- extra holds the handful of type-specific fields (intention/goals for
-- morning, went_well/could_improve/gratitude for evening) — small and
-- well-scoped enough that a jsonb column is simpler than two more tables.
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null default current_date,
  entry_type public.journal_entry_type not null,
  mood smallint check (mood between 1 and 5),
  text text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date, entry_type)
);

create index journal_entries_user_id_entry_date_idx
  on public.journal_entries (user_id, entry_date desc);

alter table public.journal_entries enable row level security;

create policy "journal_entries_all_own"
  on public.journal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_journal_entries_updated_at
  before update on public.journal_entries
  for each row
  execute function public.set_updated_at();
