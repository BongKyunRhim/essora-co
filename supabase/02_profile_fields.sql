-- Run this ONCE, after schema.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
-- Adds the extra profile fields (age, photo, college, major, etc.) and a
-- place to store uploaded profile photos.

-- Extra columns on the profiles table (safe to run more than once).
alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists college text;
alter table public.profiles add column if not exists major text;
alter table public.profiles add column if not exists long_bio text;
alter table public.profiles add column if not exists high_school text;
alter table public.profiles add column if not exists grad_year integer;

-- A public bucket to hold profile photos so they can be shown on cards.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can view photos; a user can upload/replace only their own
-- (files live in a folder named after their user id).
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars upload own" on storage.objects;
create policy "avatars upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
