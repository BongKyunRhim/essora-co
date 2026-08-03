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

  // Fetch existing profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "reviewer") return res.status(403).json({ error: "Reviewers only." });

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const origin = req.headers.origin || "https://essora.co";

  // Reuse existing account or create a new Express account
  let accountId = profile?.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({ type: "express" });
    accountId = account.id;
    await supabase.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
  }

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/#/reviewer?stripe=refresh`,
    return_url:  `${origin}/#/reviewer?stripe=connected`,
    type: "account_onboarding",
  });

  return res.status(200).json({ url: accountLink.url });
}
