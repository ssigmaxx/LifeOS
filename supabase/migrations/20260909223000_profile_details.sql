-- Display name, avatar icon, and birth date for the profile panel. All
-- optional (a fresh profile row has none of these set) and covered by the
-- existing profiles_select_own / profiles_update_own RLS policies.
alter table public.profiles
  add column display_name text,
  add column avatar_icon text,
  add column birth_date date;
