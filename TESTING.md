# Testing payments locally (Stripe test mode)

How money flows in ESSORA:

1. **Applicant pays** — a high schooler pays the reviewer's price via Stripe Checkout
   (`api/create-checkout-session.js`). The full amount lands in the platform's
   Stripe balance.
2. **Webhook confirms** — Stripe calls `api/stripe-webhook.js`
   (`checkout.session.completed`) which marks the request `paid` in Supabase.
3. **Reviewer is paid out** — when the review is submitted,
   `api/payout-reviewer.js` transfers **97%** of the price to the reviewer's
   connected Stripe Express account. The remaining **3% commission stays in the
   platform's balance**.

> Note: Stripe's own processing fee (~2.9% + 30¢ per card charge) is deducted
> from the platform's balance, not the reviewer's share. On small prices the 3%
> commission does not fully cover Stripe's fee — e.g. on a $25 essay you keep
> 75¢ commission but pay ~$1.03 in Stripe fees. Keep this in mind when pricing.

---

## 1. Switch from live mode back to test mode

Test vs. live is decided **only by which keys the server uses** — no code changes.

**Locally** (`.env`, see below): use `sk_test_...` keys.

**On Vercel** (the deployed site):
1. Stripe dashboard → toggle **Test mode** (top right) → Developers → API keys →
   copy the **test** secret key (`sk_test_...`).
2. Vercel → your project → Settings → Environment Variables →
   set `STRIPE_SECRET_KEY` to the test key.
3. Still in test mode, go to Developers → Webhooks → add (or reuse) an endpoint
   for `https://<your-domain>/api/stripe-webhook` listening to
   `checkout.session.completed`, and copy its **signing secret** (`whsec_...`)
   into Vercel's `STRIPE_WEBHOOK_SECRET`. (Live-mode webhook secrets do not work
   for test-mode events.)
4. Redeploy (Deployments → ⋯ → Redeploy) so the functions pick up the new vars.

To go live later, reverse the swap: live `sk_live_...` key + the live webhook
endpoint's signing secret, then redeploy.

**Important — test mode has separate data.** Connected reviewer accounts,
customers, and payments from live mode don't exist in test mode. Reviewers must
redo Stripe Connect onboarding while in test mode (the Express onboarding flow
auto-fills with test values; use SSN `000-00-0000`, any future date, etc.).

## 2. Run the whole stack on localhost

Plain `npm run dev` only serves the React app — the `/api/*` functions are
Vercel serverless functions, so payments will 404. Use `vercel dev` instead:

```bash
# One-time setup
npm i -g vercel        # Vercel CLI
vercel link            # link this folder to your Vercel project
cp .env.example .env   # fill in TEST keys

# Every session — terminal 1: app + api on http://localhost:3000
vercel dev

# Terminal 2: forward Stripe webhooks to your local server
# (install Stripe CLI first: https://docs.stripe.com/stripe-cli)
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

`stripe listen` prints a signing secret like `whsec_...` — put that in `.env`
as `STRIPE_WEBHOOK_SECRET` and restart `vercel dev`. Without this the webhook
never fires locally and requests stay stuck on "unpaid".

## 3. Test the full money flow

1. **Applicant side** — sign in as an applicant at `http://localhost:3000`,
   pick a reviewer, submit an essay, and pay on the Stripe test checkout with:

   | Card | Result |
   |---|---|
   | `4242 4242 4242 4242` | Payment succeeds |
   | `4000 0000 0000 9995` | Declined — insufficient funds |
   | `4000 0025 0000 3155` | Requires 3-D Secure authentication |

   Any future expiry, any CVC, any ZIP.

2. **Webhook** — watch the `stripe listen` terminal: you should see
   `checkout.session.completed → 200`. The request flips to `paid` in Supabase
   and appears in the reviewer's notifications.

3. **Reviewer side** — sign in as a reviewer, connect Stripe (test onboarding),
   then complete the review. `payout-reviewer` transfers 97% to the reviewer's
   test account.

4. **Verify the split** in the Stripe test dashboard:
   - **Payments** — the full charge from the applicant.
   - **Connect → Transfers** — the 97% transfer to the reviewer.
   - **Balance** — the 3% difference stays as platform balance.

## 4. Pre-launch checklist

- [ ] Full flow passes on localhost with test cards (success, decline, 3DS)
- [ ] Webhook returns 200 and request flips to `paid`
- [ ] Transfer amount = 97% of price; platform balance keeps 3%
- [ ] Payout is skipped gracefully when the reviewer hasn't connected Stripe
- [ ] Cancelled checkout deletes the unpaid request (back-button flow)
- [ ] Swap Vercel env vars back to live keys + live webhook secret, redeploy
- [ ] One real small-value live transaction end-to-end, then refund it
