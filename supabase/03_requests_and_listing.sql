-- Run this ONCE, after 02_profile_fields.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
-- Adds a listing on/off switch for reviewers and a table of review requests
-- so reviewers get "notifications" when an applicant asks for a review.

-- Reviewers can hide their profile without deleting it.
alter table public.profiles add column if not exists is_listed boolean not null default true;

-- One row per review request from an applicant to a reviewer.
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.requests enable row level security;

-- An applicant can create a request as themselves.
drop policy if exists "applicant creates own request" on public.requests;
create policy "applicant creates own request" on public.requests
  for insert to authenticated
  with check (applicant_id = auth.uid());

-- Both people involved can read a request.
drop policy if exists "read own requests" on public.requests;
create policy "read own requests" on public.requests
  for select to authenticated
  using (applicant_id = auth.uid() or reviewer_id = auth.uid());

-- The reviewer can accept/decline a request addressed to them.
drop policy if exists "reviewer updates request" on public.requests;
create policy "reviewer updates request" on public.requests
  for update to authenticated
  using (reviewer_id = auth.uid());

-- Rebuild the profile read rules now that "is_listed" exists.
drop policy if exists "read reviewers or self" on public.profiles;
drop policy if exists "read self" on public.profiles;
drop policy if exists "read listed reviewers" on public.profiles;
drop policy if exists "reviewer reads requesting applicants" on public.profiles;

-- You can always read your own row.
create policy "read self" on public.profiles
  for select using (id = auth.uid());

-- Anyone can read reviewers who are currently listed.
create policy "read listed reviewers" on public.profiles
  for select using (role = 'reviewer' and is_listed = true);

-- A reviewer can read the profile of any applicant who has requested them
-- (so their notifications can show the applicant's name and info).
create policy "reviewer reads requesting applicants" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.applicant_id = profiles.id and r.reviewer_id = auth.uid()
    )
  );
