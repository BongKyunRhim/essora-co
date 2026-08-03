-- Run this ONCE after 10_applicant_dismiss.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- After reading their feedback, an applicant can rate the reviewer
-- (1-5 stars + an optional comment). Ratings show on the reviewer's
-- public profile. One rating per completed review; the applicant can
-- revise theirs. The applicant's name is snapshotted onto the row so
-- other visitors can see who wrote it without opening up profile reads.

create table if not exists public.reviewer_ratings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  applicant_name text,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviewer_ratings enable row level security;

-- Ratings are public to signed-in users (they appear on reviewer profiles).
drop policy if exists "read ratings" on public.reviewer_ratings;
create policy "read ratings" on public.reviewer_ratings
  for select to authenticated
  using (true);

-- An applicant can rate only their own completed review, as themselves.
drop policy if exists "applicant writes own rating" on public.reviewer_ratings;
create policy "applicant writes own rating" on public.reviewer_ratings
  for insert to authenticated
  with check (
    applicant_id = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = request_id
        and r.applicant_id = auth.uid()
        and r.reviewer_id = reviewer_ratings.reviewer_id
        and r.status = 'completed'
    )
  );

-- And revise it later.
drop policy if exists "applicant updates own rating" on public.reviewer_ratings;
create policy "applicant updates own rating" on public.reviewer_ratings
  for update to authenticated
  using (applicant_id = auth.uid())
  with check (applicant_id = auth.uid());
