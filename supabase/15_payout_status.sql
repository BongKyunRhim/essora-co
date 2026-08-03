-- Run after 14_stripe_connect.sql
alter table public.requests
  add column if not exists payout_status text not null default 'unpaid'
    check (payout_status in ('unpaid', 'paid')),
  add column if not exists stripe_transfer_id text;
