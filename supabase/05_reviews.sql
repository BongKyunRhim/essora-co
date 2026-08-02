-- Run this ONCE after 04_request_details.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
-- Adds the reviews table (suggestions, ratings, final comment) and lets a
-- request be marked 'completed' once the reviewer submits their review.

-- Allow the new 'completed' status.
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check
  check (status in ('pending', 'accepted', 'declined', 'completed'));

-- One review per request, written by the reviewer.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  suggestions jsonb not null default '[]'::jsonb,
  ratings jsonb not null default '{}'::jsonb,
  final_comment text,
  submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

-- The reviewer owns their review (drafts and the final submission),
-- but only for requests that are actually addressed to them.
drop policy if exists "reviewer manages own review" on public.reviews;
create policy "reviewer manages own review" on public.reviews
  for all to authenticated
  using (reviewer_id = auth.uid())
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = request_id and r.reviewer_id = auth.uid()
    )
  );

-- The applicant can read the review once it has been submitted.
drop policy if exists "applicant reads submitted review" on public.reviews;
create policy "applicant reads submitted review" on public.reviews
  for select to authenticated
  using (
    submitted
    and exists (
      select 1 from public.requests r
      where r.id = reviews.request_id and r.applicant_id = auth.uid()
    )
  );

-- Keep updated_at fresh on every save.
create or replace function public.touch_reviews_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_reviews_updated_at();
