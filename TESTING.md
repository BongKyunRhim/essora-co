# Testing payments locally (Stripe test mode) — step by step

## How the money flows in ESSORA

1. **Applicant pays** — a high schooler pays the reviewer's price **plus a
   processing fee** (2.9% + 30¢, grossed up) via Stripe Checkout
   (`api/create-checkout-session.js`). Checkout shows both line items. The
   full amount lands in the platform's Stripe balance, and the surcharge
   covers Stripe's own processing cost.
2. **Webhook confirms** — Stripe calls `api/stripe-webhook.js`
   (`checkout.session.completed`) which marks the request `paid` in Supabase.
3. **Reviewer is paid out** — when the review is submitted,
   `api/payout-reviewer.js` transfers **97%** of the price to the reviewer's
   connected Stripe Express account. The remaining **3% commission stays in the
   platform's balance**.

> Example on a $25 essay: applicant pays $26.07 ($25 + $1.07 processing fee),
> Stripe takes ~$1.06, the reviewer receives $24.25 (97%), and the platform
> keeps the 75¢ commission.

---

## Part 1 — One-time setup on your computer

### 1.1 Get the latest code

```bash
cd path/to/essora-co
git pull origin main
npm install
```

### 1.2 Install the Vercel CLI

The `/api/*.js` files are **Vercel serverless functions**. Plain `npm run dev`
(Vite) only serves the React app — any call to `/api/...` would 404, so
payments can never work that way. The Vercel CLI runs both together.

```bash
npm i -g vercel
vercel --version   # should print a version number
```

### 1.3 Install the Stripe CLI

Needed to deliver webhook events to your laptop (Stripe's servers can't reach
`localhost`).

- **Mac (Homebrew):** `brew install stripe/stripe-cli/stripe`
- **Windows (Scoop):** `scoop install stripe`
- **Anything else:** download from <https://docs.stripe.com/stripe-cli>

```bash
stripe version     # should print a version number
```

### 1.4 Link the folder to your Vercel project

```bash
vercel link
```

Answer the prompts:
- *"Set up …/essora-co?"* → **Y**
- *"Which scope?"* → your account
- *"Link to existing project?"* → **Y**
- *"What's the name of your existing project?"* → the project that deploys
  essora.co (probably `essora-co` or `essora`)

This creates a hidden `.vercel` folder (already gitignored).

### 1.5 Collect your three secret keys

Create the env file:

```bash
cp .env.example .env
```

Now fill in `.env` — here is exactly where each value lives:

**`STRIPE_SECRET_KEY`** (must start with `sk_test_`)
1. Go to <https://dashboard.stripe.com>
2. Top-right corner: flip the **Test mode** toggle ON (the page gets an orange
   "TEST" banner)
3. Left sidebar → **Developers** → **API keys**
4. Under "Standard keys", row **Secret key** → click **Reveal test key** →
   copy. It starts with `sk_test_`. (If it starts with `sk_live_`, the Test
   mode toggle is off — flip it and try again.)

**`SUPABASE_SERVICE_ROLE_KEY`**
1. Go to <https://supabase.com/dashboard>, open your project
2. Gear icon (**Project Settings**) → **API**
3. Under "Project API keys", copy the **`service_role`** key (NOT `anon`).
   It's a long string starting with `eyJ`.
4. This key bypasses all security rules — it only ever goes in `.env` /
   Vercel env vars, never in frontend code, never in git.

**`STRIPE_WEBHOOK_SECRET`** — leave blank for now; Part 2 gives it to you.

---

## Part 2 — Running it (every test session)

You need **two terminals side by side**.

### Terminal 1 — the app

```bash
cd path/to/essora-co
vercel dev
```

Wait for `Ready! Available at http://localhost:3000`. This serves the React
app AND the `/api/*` functions with your `.env` loaded.

### Terminal 2 — webhook forwarding

```bash
stripe login    # first time only — opens browser, click Allow access
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

It immediately prints:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**Copy that `whsec_...` value** into `.env` as `STRIPE_WEBHOOK_SECRET`, then
go to terminal 1, press `Ctrl+C`, and run `vercel dev` again so it picks up
the new value. (The secret stays the same for ~90 days, so you only redo this
rarely.)

Leave `stripe listen` running the entire time you test. If it's not running,
payments will succeed on Stripe's side but your app will never find out —
requests will sit on "unpaid" forever.

---

## Part 3 — Testing the full money flow

### 3.1 Prepare a test reviewer

Test mode is a **separate universe** from live mode: no live Connect accounts,
customers, or payments exist there. Any reviewer whose Stripe account was
connected in live mode has a `stripe_account_id` in Supabase that test mode
doesn't recognize — payouts to them will fail locally.

Easiest path: use (or create) a reviewer account, then:

1. Sign in as that reviewer at `http://localhost:3000`
2. Profile settings → connect Stripe
3. You land on Stripe's **test onboarding** — nothing is real here:
   - Phone: click **"the test phone number"** link (or type `000 000 0000`)
   - SMS code: click **"Use test code"**
   - SSN: `000-00-0000` · DOB: any date · Address: any real-format US address
   - Bank account: use the prefilled test routing/account numbers
4. Finish → you're redirected back with Stripe marked connected

If the reviewer was previously connected in live mode, first clear their row in
Supabase (Table Editor → `profiles`): set `stripe_account_id` to NULL and
`stripe_onboarded` to false, then connect again locally.

### 3.2 Pay as an applicant

1. In a second browser (or private window) sign in as an **applicant**
2. Find Reviewers → pick your test reviewer → Submit Your Essay
3. Fill in essay + type + notes → **Pay & Submit**
4. On the Stripe Checkout page verify **two line items**: the review and
   "Processing fee"
5. Pay with:

   | Card number | What it tests |
   |---|---|
   | `4242 4242 4242 4242` | Successful payment |
   | `4000 0000 0000 9995` | Card declined (insufficient funds) |
   | `4000 0025 0000 3155` | 3-D Secure challenge (click **Complete** in the modal) |

   Expiry: any future date · CVC: any 3 digits · ZIP: any 5 digits

6. On success you're redirected to the payment-success page

### 3.3 Confirm the webhook fired

In terminal 2 you should see:

```
checkout.session.completed  --> POST http://localhost:3000/api/stripe-webhook [200]
```

`[200]` = your app marked the request paid. The essay now appears in the
reviewer's notifications, and Supabase (`requests` table) shows
`payment_status = 'paid'`.

### 3.4 Complete the review and check the payout

1. As the reviewer, open the submission from notifications and submit feedback
2. In the Stripe **test** dashboard (Test mode ON):
   - **Payments** → the full charge (e.g. $26.07)
   - **Connect → Transfers** → the 97% transfer (e.g. $24.25)
   - **Balance** → what remains is Stripe's fee + your 3% commission

### 3.5 Test the cancel path

Start a submission, then click the browser back button / Cancel on the Stripe
page. You should land back on the form with a "Payment was cancelled" notice,
and the unpaid row is deleted from Supabase.

---

## Part 4 — Switching the DEPLOYED site between live and test

The deployed site's mode is decided only by its env vars in Vercel:

| Variable | Test mode | Live mode |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | test endpoint's `whsec_...` | live endpoint's `whsec_...` |

Webhook endpoints are also per-mode: with Test mode ON in the Stripe
dashboard, Developers → Webhooks → **Add endpoint** →
`https://essora.co/api/stripe-webhook` → event `checkout.session.completed` →
copy its signing secret. Your live endpoint stays untouched for later.

After changing env vars: Vercel → Deployments → ⋯ → **Redeploy** (env vars
only apply to new deployments).

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `/api/...` returns 404 | You ran `npm run dev`. Use `vercel dev`. |
| "Server misconfiguration." | A var in `.env` is missing/empty. Restart `vercel dev` after editing. |
| Payment succeeds but request stays unpaid | `stripe listen` not running, or `STRIPE_WEBHOOK_SECRET` doesn't match its printed secret. |
| Webhook shows `[400]` | Secret mismatch — recopy from `stripe listen`, restart `vercel dev`. |
| Payout fails: "No such destination" | Reviewer's `stripe_account_id` is from live mode. Clear it in Supabase and reconnect in test mode (§3.1). |
| Checkout shows real card form / no TEST badge | `STRIPE_SECRET_KEY` is a live key. Swap to `sk_test_...`. |
| `vercel dev` port already in use | `vercel dev --listen 3001` and update `stripe listen --forward-to` to match. |

---

## Pre-launch checklist

- [ ] Full flow passes on localhost: success card, decline card, 3DS card
- [ ] Both line items (review + processing fee) show on Checkout
- [ ] Webhook returns 200 and the request flips to `paid`
- [ ] Transfer = 97% of price; platform balance keeps the 3% commission
- [ ] Payout is skipped gracefully when the reviewer hasn't connected Stripe
- [ ] Cancelled checkout deletes the unpaid request
- [ ] Vercel env vars swapped back to live key + live webhook secret, redeployed
- [ ] One real small-value live transaction end-to-end, then refund it
