-- Optional gender field on the profile panel. Only two options are
-- collected (male/female) — kept nullable so existing rows are unaffected
-- until a user fills it in, same as the other profile-details columns.
alter table public.profiles
  add column gender text check (gender in ('male', 'female'));
