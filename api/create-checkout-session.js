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

  const { request_id, reviewer_id, price_cents, reviewer_name, essay_type } = req.body ?? {};
  if (!request_id || !reviewer_id || !price_cents) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const origin = req.headers.origin || "https://essora.co";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: price_cents,
          product_data: {
            name: `Essay Review by ${reviewer_name}`,
            description: essay_type ? `Essay type: ${essay_type}` : undefined,
          },
        },
        quantity: 1,
      },
    ],
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
