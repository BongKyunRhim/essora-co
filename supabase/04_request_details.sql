-- Run this ONCE after 03_requests_and_listing.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Adds extra detail columns to the requests table.

alter table public.requests
  add column if not exists essay_url   text,
  add column if not exists essay_name  text,
  add column if not exists essay_type  text,
  add column if not exists school_name text,
  add column if not exists turnaround  text check (turnaround in ('asap', '1-3days', '1week', 'flexible')),
  add column if not exists focus_areas text[];
