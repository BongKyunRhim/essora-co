-- Run this ONCE after 05_reviews.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Essays are now stored as plain text (pasted or extracted from the
-- uploaded file), so reviewers always get selectable, highlightable text.
-- The original file upload is kept only as a downloadable attachment.

alter table public.requests add column if not exists essay_text text;
