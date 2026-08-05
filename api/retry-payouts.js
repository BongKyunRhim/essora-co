import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hpfogpvschhzzyksbwcg.supabase.co";

// Sweeps every completed, paid-for review of the calling reviewer that hasn't
// been paid out yet. Called from the notifications page so missed payouts
// (review submitted before onboarding, insufficient balance at the time, etc.)
// self-heal the next time the reviewer checks their submissions. Logs every
// decision so Vercel logs show exactly why a payout did or didn't happen.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!STRIPE_SECRET_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Server misconfiguration." });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.slice(7));
  if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, price, stripe_account_id, stripe_onboarded")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "reviewer") {
    return res.status(200).json({ swept: 0, reason: "Not a reviewer." });
  }
  if (!profile.stripe_onboarded || !profile.stripe_account_id) {
    console.log("retry-payouts: reviewer", user.id, "not onboarded — skipping. onboarded:", profile.stripe_onboarded, "account:", profile.stripe_account_id);
    return res.status(200).json({ swept: 0, reason: "Reviewer not connected to Stripe." });
  }

  const priceCents = Math.round((profile.price ?? 0) * 100);
  if (priceCents <= 0) {
    console.log("retry-payouts: reviewer", user.id, "has no price set — skipping.");
    return res.status(200).json({ swept: 0, reason: "No price set." });
  }

  const PLATFORM_FEE_PCT = 0.03;
  const payoutCents = Math.round(priceCents * (1 - PLATFORM_FEE_PCT));

  const { data: pending } = await supabase
    .from("requests")
    .select("id, payout_status, status, payment_status")
    .eq("reviewer_id", user.id)
    .eq("status", "completed")
    .eq("payment_status", "paid")
    .neq("payout_status", "paid");

  console.log("retry-payouts: reviewer", user.id, "eligible unpaid requests:", (pending ?? []).map((r) => r.id));

  if (!pending?.length) {
    return res.status(200).json({ swept: 0, reason: "Nothing to pay out." });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const results = [];

  for (const reqRow of pending) {
    try {
      const transfer = await stripe.transfers.create({
        amount:         payoutCents,
        currency:       "usd",
        destination:    profile.stripe_account_id,
        transfer_group: reqRow.id,
      });
      await supabase
        .from("requests")
        .update({ payout_status: "paid", stripe_transfer_id: transfer.id })
        .eq("id", reqRow.id);
      console.log("retry-payouts: PAID request", reqRow.id, "transfer", transfer.id, "amount", payoutCents);
      results.push({ request_id: reqRow.id, ok: true, transfer_id: transfer.id });
    } catch (err) {
      console.error("retry-payouts: FAILED request", reqRow.id, "—", err.message);
      results.push({ request_id: reqRow.id, ok: false, error: err.message });
    }
  }

  return res.status(200).json({
    swept: results.filter((r) => r.ok).length,
    results,
  });
}
