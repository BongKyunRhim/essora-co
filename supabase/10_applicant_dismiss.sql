-- Run this ONCE after 09_applicant_feedback.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Lets applicants clear completed/declined items from their My Essays list
-- without touching the reviewer's copy (each side has its own flag).

alter table public.requests
  add column if not exists applicant_dismissed boolean not null default false;

grant update (applicant_dismissed) on table public.requests to authenticated;
