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

  const { request_id } = req.body ?? {};
  if (!request_id) return res.status(400).json({ error: "request_id required." });

  // Fetch the request + reviewer profile
  const { data: request } = await supabase
    .from("requests")
    .select("*, profiles!requests_reviewer_id_fkey(price, stripe_account_id, stripe_onboarded)")
    .eq("id", request_id)
    .single();

  if (!request) return res.status(404).json({ error: "Request not found." });
  if (request.reviewer_id !== user.id) return res.status(403).json({ error: "Not your review." });
  if (request.payment_status !== "paid") return res.status(400).json({ error: "Not yet paid by applicant." });
  if (request.payout_status === "paid") return res.status(200).json({ already: true });

  const reviewer = request.profiles;
  if (!reviewer?.stripe_onboarded || !reviewer?.stripe_account_id) {
    // No Stripe account yet — skip silent so review can still be submitted
    return res.status(200).json({ skipped: true, reason: "Reviewer not connected to Stripe." });
  }

  const priceCents = (reviewer.price ?? 0) * 100;
  if (priceCents <= 0) return res.status(200).json({ skipped: true, reason: "No price set." });

  // Platform keeps a 3% commission; the reviewer receives the remaining 97%.
  const PLATFORM_FEE_PCT = 0.03;
  const payoutCents = Math.round(priceCents * (1 - PLATFORM_FEE_PCT));

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const transfer = await stripe.transfers.create({
    amount:         payoutCents,
    currency:       "usd",
    destination:    reviewer.stripe_account_id,
    transfer_group: request_id,
  });

  // Record payout on the request
  await supabase
    .from("requests")
    .update({ payout_status: "paid", stripe_transfer_id: transfer.id })
    .eq("id", request_id);

  return res.status(200).json({ success: true, transfer_id: transfer.id });
}
