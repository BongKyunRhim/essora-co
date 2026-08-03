-- Run this ONCE after 11_reviewer_ratings.sql:
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Reviewers now start with is_listed = false so their profile is
-- hidden from applicants until they've filled it in and opted in.
-- Applicants are unaffected (is_listed stays true / irrelevant).
-- Existing reviewer accounts are not changed.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_listed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'applicant'),
    case
      when coalesce(new.raw_user_meta_data ->> 'role', 'applicant') = 'reviewer'
      then false
      else true
    end
  );
  return new;
end;
$$;
