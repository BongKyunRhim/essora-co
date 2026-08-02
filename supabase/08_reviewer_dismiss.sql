-- Run this ONCE after 07_lock_essay_edits.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Lets reviewers dismiss completed/declined submissions from the
-- notifications list without deleting the underlying data.

alter table public.requests
  add column if not exists reviewer_dismissed boolean not null default false;

-- 07_lock_essay_edits.sql already granted update(status); extend it to
-- reviewer_dismissed so the reviewer can also set this flag via the API.
grant update (reviewer_dismissed) on table public.requests to authenticated;
