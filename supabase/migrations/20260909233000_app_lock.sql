-- App-level screen lock: a 4-digit PIN gating access to an already
-- logged-in session on a shared/unattended device. This is deliberately
-- NOT part of Supabase Auth — the session stays valid the whole time; the
-- PIN only gates the client-side UI. Salted + hashed, never stored plain.
alter table public.profiles
  add column lock_pin_hash text,
  add column lock_pin_salt text;
