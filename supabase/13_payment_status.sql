-- Run this in Supabase dashboard → SQL Editor.
-- Adds payment tracking columns to requests.

alter table public.requests
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  add column if not exists stripe_session_id text;
