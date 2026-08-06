import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hpfogpvschhzzyksbwcg.supabase.co";
const REVIEW_DEADLINE_DAYS = 3;

// Daily Vercel cron (see vercel.json): finds paid submissions whose review
// wasn't completed within the deadline, refunds the applicant in full
// (reversing the reviewer's share and the platform fee), and marks the
// request expired. Both parties are emailed when Resend is configured.
export default async function handler(req, res) {
  const { STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, RESEND_API_KEY, EMAIL_FROM } = process.env;
  if (!STRIPE_SECRET_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Server misconfiguration." });
  }

  // Vercel cron sends Authorization: Bearer <CRON_SECRET> when the env var is set.
  if (!CRON_SECRET || req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  const { data: candidates } = await supabase
    .from("requests")
    .select("id, applicant_id, reviewer_id, stripe_session_id, paid_at, created_at")
    .eq("payment_status", "paid")
    .in("status", ["pending", "accepted"]);

  const cutoff = Date.now() - REVIEW_DEADLINE_DAYS * 24 * 60 * 60 * 1000;
  const overdue = (candidates ?? []).filter(
    (r) => new Date(r.paid_at ?? r.created_at).getTime() < cutoff
  );

  console.log("expire-reviews: checking", candidates?.length ?? 0, "open requests,", overdue.length, "overdue");

  const results = [];
  for (const reqRow of overdue) {
    try {
      if (!reqRow.stripe_session_id) throw new Error("No stripe_session_id on request.");

      const session = await stripe.checkout.sessions.retrieve(reqRow.stripe_session_id);
      if (!session.payment_intent) throw new Error("No payment_intent on session.");

      // Full refund to the applicant; pull the reviewer's share back and
      // return the platform's application fee as part of it.
      await stripe.refunds.create({
        payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id,
        reverse_transfer: true,
        refund_application_fee: true,
      });

      await supabase
        .from("requests")
        .update({ status: "expired", payment_status: "refunded", payout_status: "reversed" })
        .eq("id", reqRow.id);

      console.log("expire-reviews: REFUNDED request", reqRow.id);
      results.push({ request_id: reqRow.id, ok: true });

      await notifyParties(supabase, reqRow, { RESEND_API_KEY, EMAIL_FROM });
    } catch (err) {
      console.error("expire-reviews: FAILED request", reqRow.id, "—", err.message);
      results.push({ request_id: reqRow.id, ok: false, error: err.message });
    }
  }

  return res.status(200).json({ checked: candidates?.length ?? 0, expired: results });
}

async function notifyParties(supabase, reqRow, { RESEND_API_KEY, EMAIL_FROM }) {
  if (!RESEND_API_KEY) return;

  const send = (to, subject, html) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: EMAIL_FROM || "ESSORA <onboarding@resend.dev>", to, subject, html }),
    }).catch((err) => console.error("expire-reviews: email failed —", err.message));

  try {
    const [{ data: applicantUser }, { data: reviewerUser }] = await Promise.all([
      supabase.auth.admin.getUserById(reqRow.applicant_id),
      supabase.auth.admin.getUserById(reqRow.reviewer_id),
    ]);

    const applicantEmail = applicantUser?.user?.email;
    const reviewerEmail = reviewerUser?.user?.email;

    if (applicantEmail) {
      await send(
        applicantEmail,
        "Your essay review was refunded",
        `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #111417;">
          <h2 style="font-weight: 600; color: #152540;">Your review didn't arrive in time</h2>
          <p>Your reviewer didn't complete your essay review within 3 days, so
          we've automatically refunded your full payment — including the
          processing fee — to your original payment method. Refunds typically
          appear within 5–10 business days.</p>
          <p>You're welcome to submit your essay to another reviewer any time.</p>
          <p style="margin: 28px 0;">
            <a href="https://essora.co/#/applicant"
               style="background: #1e3355; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
              Find another reviewer
            </a>
          </p>
        </div>`
      );
    }

    if (reviewerEmail) {
      await send(
        reviewerEmail,
        "A submission expired and was refunded",
        `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #111417;">
          <h2 style="font-weight: 600; color: #152540;">A submission expired</h2>
          <p>An essay submitted to you wasn't reviewed within the 3-day
          deadline, so the applicant was automatically refunded and your share
          of the payment was reversed.</p>
          <p>Completing reviews on time keeps your profile in good standing.
          If you're unable to take on new essays for a while, you can hide
          your profile in your settings.</p>
        </div>`
      );
    }
  } catch (err) {
    console.error("expire-reviews: notify failed —", err.message);
  }
}
