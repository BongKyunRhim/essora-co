-- Run this ONCE after 06_essay_text.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- The reviewer's update permission on requests exists only to mark a
-- submission 'completed'. Lock updates down to the status column so the
-- essay text, file, and notes can never be modified after submission —
-- not even through the API directly.

revoke update on table public.requests from authenticated;
grant update (status) on table public.requests to authenticated;
