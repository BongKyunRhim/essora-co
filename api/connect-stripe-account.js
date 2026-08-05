import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hpfogpvschhzzyksbwcg.supabase.co";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!STRIPE_SECRET_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Server misconfiguration: missing env vars." });
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

  const makeFreshAccount = async () => {
    const account = await stripe.accounts.create({ type: "express" });
    await supabase
      .from("profiles")
      .update({ stripe_account_id: account.id, stripe_onboarded: false })
      .eq("id", user.id);
    return account.id;
  };

  const makeLink = (accountId) =>
    stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/#/reviewer?stripe=refresh`,
      return_url:  `${origin}/#/reviewer?stripe=connected`,
      type: "account_onboarding",
    });

  try {
    let accountId = profile?.stripe_account_id || (await makeFreshAccount());

    let accountLink;
    try {
      accountLink = await makeLink(accountId);
    } catch (err) {
      // The stored account belongs to the other Stripe mode (live account
      // while testing, or test account after going live) — link creation is
      // the only call that rejects it. Discard it and retry with a fresh one.
      accountId = await makeFreshAccount();
      accountLink = await makeLink(accountId);
    }

    return res.status(200).json({ url: accountLink.url });
  } catch (err) {
    console.error("Stripe Connect error:", err);
    return res.status(500).json({ error: err.message || "Stripe error." });
  }
}
