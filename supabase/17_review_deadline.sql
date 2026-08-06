-- Run this in Supabase dashboard → SQL Editor.
--
-- 3-day review deadline: if a paid review isn't completed within 3 days,
-- a daily cron (api/expire-reviews.js) refunds the applicant in full and
-- reverses the reviewer's share.

-- When the payment was confirmed (set by the Stripe webhook); the deadline
-- is paid_at + 3 days.
alter table public.requests add column if not exists paid_at timestamptz;

-- Allow the 'expired' status for requests that ran out the clock.
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check
  check (status in ('pending', 'accepted', 'declined', 'completed', 'expired'));

-- Allow 'reversed' payout status for clawed-back reviewer shares.
alter table public.requests drop constraint if exists requests_payout_status_check;
alter table public.requests add constraint requests_payout_status_check
  check (payout_status in ('unpaid', 'paid', 'reversed'));
