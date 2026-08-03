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
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_account_id) {
    return res.status(400).json({ error: "No Stripe account found." });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const account = await stripe.accounts.retrieve(profile.stripe_account_id);

  const onboarded = account.details_submitted;
  await supabase
    .from("profiles")
    .update({ stripe_onboarded: onboarded })
    .eq("id", user.id);

  return res.status(200).json({ onboarded });
}
