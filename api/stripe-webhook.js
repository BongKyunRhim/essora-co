import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hpfogpvschhzzyksbwcg.supabase.co";

const ESSAY_TYPE_LABELS = {
  personal_statement: "Common App / Personal Statement",
  supplemental:       "Supplemental Essay",
  scholarship:        "Scholarship Essay",
  other:              "Other",
};

// Notify the reviewer by email that a paid submission is waiting. Best-effort:
// a failure (or missing RESEND_API_KEY) never blocks the webhook.
async function emailReviewer(supabase, { request_id, reviewer_id, applicant_id }) {
  const { RESEND_API_KEY, EMAIL_FROM } = process.env;
  if (!RESEND_API_KEY) {
    console.log("stripe-webhook: RESEND_API_KEY not set — skipping reviewer email.");
    return;
  }

  const [{ data: reviewerUser }, { data: applicant }, { data: reqRow }] = await Promise.all([
    supabase.auth.admin.getUserById(reviewer_id),
    supabase.from("profiles").select("full_name").eq("id", applicant_id).single(),
    supabase.from("requests").select("essay_type").eq("id", request_id).single(),
  ]);

  const to = reviewerUser?.user?.email;
  if (!to) {
    console.log("stripe-webhook: no email found for reviewer", reviewer_id);
    return;
  }

  const applicantName = applicant?.full_name || "An applicant";
  const essayType = ESSAY_TYPE_LABELS[reqRow?.essay_type] ?? "Essay";
  const link = `https://essora.co/#/requests/${request_id}`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM || "ESSORA <onboarding@resend.dev>",
      to,
      subject: `New essay submission from ${applicantName}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #111417;">
          <h2 style="font-weight: 600; color: #152540;">You have a new essay to review</h2>
          <p><strong>${applicantName}</strong> just submitted their essay
          (${essayType}) and is waiting on your feedback. Payment is complete —
          your share is already on its way to your account.</p>
          <p style="margin: 28px 0;">
            <a href="${link}"
               style="background: #1e3355; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
              Open the essay
            </a>
          </p>
          <p style="font-size: 13px; color: #6d7480;">
            You're receiving this because you're a reviewer on ESSORA.
          </p>
        </div>
      `,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("stripe-webhook: reviewer email failed —", err);
  } else {
    console.log("stripe-webhook: reviewer email sent to", to, "for request", request_id);
  }
}

// Vercel buffers the body by default, which breaks signature verification.
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end",  () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Server misconfiguration." });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const sig    = req.headers["stripe-signature"];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status !== "paid") return res.status(200).end();

    const { request_id, reviewer_id, applicant_id } = session.metadata ?? {};
    if (!request_id) return res.status(200).end();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Destination charge: the reviewer's share is transferred as part of the
    // payment itself, so the payout is settled the moment the charge succeeds.
    await supabase
      .from("requests")
      .update({ payment_status: "paid", payout_status: "paid" })
      .eq("id", request_id);

    try {
      await emailReviewer(supabase, { request_id, reviewer_id, applicant_id });
    } catch (err) {
      console.error("stripe-webhook: reviewer email errored —", err.message);
    }
  }

  return res.status(200).json({ received: true });
}
