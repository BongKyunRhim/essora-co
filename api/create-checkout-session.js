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
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.slice(7));
  if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

  const { request_id, reviewer_id, essay_type } = req.body ?? {};
  if (!request_id || !reviewer_id) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Price comes from the database, never from the client
  const { data: reviewer } = await supabase
    .from("profiles")
    .select("price, full_name, stripe_account_id, stripe_onboarded")
    .eq("id", reviewer_id)
    .single();

  const priceCents = Math.round((reviewer?.price ?? 0) * 100);
  if (priceCents <= 0) {
    return res.status(400).json({ error: "This reviewer has no price set." });
  }

  // Destination charges need a fully onboarded connected account up front.
  if (!reviewer?.stripe_onboarded || !reviewer?.stripe_account_id) {
    return res.status(400).json({
      error: "This reviewer isn't set up to receive payments yet.",
    });
  }

  // The applicant covers Stripe's processing fee (2.9% + 30¢) on top of the
  // review price, so the platform's commission isn't eaten by it. Grossed up
  // because Stripe charges its fee on the total: total = (price + 30¢) / (1 - 2.9%).
  // Keep in sync with the same formula in src/pages/RequestReview.jsx.
  const totalCents = Math.ceil((priceCents + 30) / (1 - 0.029));
  const feeCents   = totalCents - priceCents;

  // Destination charge: Stripe routes the payment to the reviewer at charge
  // time and keeps our application fee on the platform. The reviewer receives
  // 97% of their price; the application fee (processing surcharge + 3%
  // commission) stays with the platform, out of which Stripe takes its cut.
  const PLATFORM_FEE_PCT = 0.03;
  const reviewerCents    = Math.round(priceCents * (1 - PLATFORM_FEE_PCT));
  const applicationFee   = totalCents - reviewerCents;

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const origin = req.headers.origin || "https://essora.co";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: priceCents,
          product_data: {
            name: `Essay Review by ${reviewer?.full_name ?? "Reviewer"}`,
            description: essay_type ? `Essay type: ${essay_type}` : undefined,
          },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          unit_amount: feeCents,
          product_data: { name: "Processing fee" },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      transfer_data: { destination: reviewer.stripe_account_id },
      application_fee_amount: applicationFee,
    },
    metadata: {
      request_id,
      reviewer_id,
      applicant_id: user.id,
    },
    success_url: `${origin}/#/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/#/reviewers/${reviewer_id}/request?cancelled=1&request_id=${request_id}`,
  });

  // Store the session ID on the pending request row
  await supabase
    .from("requests")
    .update({ stripe_session_id: session.id })
    .eq("id", request_id);

  return res.status(200).json({ url: session.url });
}
