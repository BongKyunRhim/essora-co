-- Run this ONCE in your Supabase project:
-- Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
-- It creates the table that stores each user's info and the rules that
-- decide who can read/write what.

-- One row per user, linked to Supabase's built-in auth users.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'applicant' check (role in ('applicant', 'reviewer')),
  bio text,
  price integer,
  created_at timestamptz not null default now()
);

-- Row Level Security: nothing is readable/writable unless a policy allows it.
alter table public.profiles enable row level security;

-- Applicants can read reviewer profiles; everyone can read their own row.
drop policy if exists "read reviewers or self" on public.profiles;
create policy "read reviewers or self" on public.profiles
  for select
  using (role = 'reviewer' or id = auth.uid());

-- Users can update only their own row.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update
  using (id = auth.uid());

-- When a new user signs up, automatically create their profile row,
-- copying the name and role they picked on the sign-up form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'applicant')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
