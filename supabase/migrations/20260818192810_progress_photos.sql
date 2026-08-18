-- Private bucket — never public. All access goes through short-lived
-- signed URLs generated server-side for the owning user.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Objects are stored at "{user_id}/{photo_date}-{photo_type}[-thumb].{ext}"
-- so storage.foldername(name)[1] (the first path segment) is the owner's
-- user_id — the standard Supabase per-user storage RLS pattern.
create policy "progress_photos_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progress_photos_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progress_photos_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progress_photos_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_date date not null default current_date,
  photo_type text not null check (photo_type in ('face', 'body')),
  storage_path text not null,
  thumbnail_path text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  unique (user_id, photo_date, photo_type)
);

create index progress_photos_user_id_photo_date_idx
  on public.progress_photos (user_id, photo_date desc);

alter table public.progress_photos enable row level security;

create policy "progress_photos_all_own"
  on public.progress_photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
