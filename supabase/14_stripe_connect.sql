-- Run after 13_payment_status.sql
-- Adds Stripe Connect fields to reviewer profiles.

alter table public.profiles
  add column if not exists stripe_account_id text,
  add column if not exists stripe_onboarded boolean not null default false;
