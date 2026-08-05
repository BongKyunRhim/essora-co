import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hpfogpvschhzzyksbwcg.supabase.co";

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
    .select("stripe_account_id, price")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_account_id) {
    return res.status(400).json({ error: "No Stripe account found." });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  // A stored account from the other Stripe mode (live vs. test) can't be
  // retrieved — treat it as not onboarded and clear it so the reviewer can
  // reconnect in the current mode.
  let account;
  try {
    account = await stripe.accounts.retrieve(profile.stripe_account_id);
  } catch {
    await supabase
      .from("profiles")
      .update({ stripe_account_id: null, stripe_onboarded: false })
      .eq("id", user.id);
    return res.status(200).json({ onboarded: false });
  }

  const onboarded = account.details_submitted;
  await supabase
    .from("profiles")
    .update({ stripe_onboarded: onboarded })
    .eq("id", user.id);

  // Catch-up sweep: pay out any completed, paid-for reviews whose payout was
  // skipped (e.g. the review was submitted before Stripe was connected).
  let sweptCount = 0;
  const priceCents = Math.round((profile.price ?? 0) * 100);
  if (onboarded && priceCents > 0) {
    const PLATFORM_FEE_PCT = 0.03;
    const payoutCents = Math.round(priceCents * (1 - PLATFORM_FEE_PCT));

    const { data: pending } = await supabase
      .from("requests")
      .select("id")
      .eq("reviewer_id", user.id)
      .eq("status", "completed")
      .eq("payment_status", "paid")
      .neq("payout_status", "paid");

    for (const reqRow of pending ?? []) {
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
        sweptCount++;
      } catch (err) {
        console.error("Catch-up payout failed for request", reqRow.id, err);
      }
    }
  }

  return res.status(200).json({ onboarded, swept: sweptCount });
}
