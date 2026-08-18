create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_user_id_idx on public.ai_conversations (user_id);

alter table public.ai_conversations enable row level security;

create policy "ai_conversations_all_own"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row
  execute function public.set_updated_at();

-- user_id is denormalized here (rather than joined through
-- ai_conversations) so both RLS and the per-user rate-limit query
-- (count messages in the last minute/day) are single-table index scans.
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- Audit trail of which tools were called for this reply — names/args
  -- only, never full tool results (those are re-fetched live on every
  -- request, never persisted, so history can't go stale or leak data
  -- across time).
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

create index ai_messages_conversation_id_idx on public.ai_messages (conversation_id, created_at);
create index ai_messages_user_id_created_at_idx on public.ai_messages (user_id, created_at);

alter table public.ai_messages enable row level security;

create policy "ai_messages_all_own"
  on public.ai_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
