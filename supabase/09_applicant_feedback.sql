-- Run this ONCE after 08_reviewer_dismiss.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Lets applicants receive their feedback: tracks whether they've opened a
-- completed review (drives the nav bell badge) and makes sure they can
-- always read the profile of a reviewer they submitted to.

alter table public.requests
  add column if not exists applicant_seen boolean not null default false;

-- Applicants may update their own requests, but the column-level grants
-- below keep that update surface tiny (applicant_seen only is new here;
-- status/reviewer_dismissed were granted for the reviewer flow).
drop policy if exists "applicant updates own request" on public.requests;
create policy "applicant updates own request" on public.requests
  for update to authenticated
  using (applicant_id = auth.uid());

grant update (applicant_seen) on table public.requests to authenticated;

-- An applicant can read the profile of any reviewer they've submitted to,
-- even if that reviewer has since unlisted themselves.
drop policy if exists "applicant reads own reviewers" on public.profiles;
create policy "applicant reads own reviewers" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.reviewer_id = profiles.id and r.applicant_id = auth.uid()
    )
  );
