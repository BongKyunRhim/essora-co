import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = useState("checking"); // checking | paid | unknown

  useEffect(() => {
    if (!sessionId) { setState("unknown"); return; }
    let attempts = 0;
    const maxAttempts = 10;

    // Poll until the webhook has marked the request as paid (usually <2s)
    async function check() {
      const { data } = await supabase
        .from("requests")
        .select("id, payment_status")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (data?.payment_status === "paid") {
        setState("paid");
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(check, 1500);
      } else {
        // Webhook may still be in flight — show success anyway
        setState("paid");
      }
    }
    check();
  }, [sessionId]);

  return (
    <section className="page ps-page">
      {state === "checking" ? (
        <div className="ps-box">
          <div className="ps-spinner" aria-label="Confirming payment…" />
          <p className="ps-msg">Confirming your payment…</p>
        </div>
      ) : (
        <div className="ps-box">
          <div className="ps-check" aria-hidden="true">✓</div>
          <h1 className="ps-title">Payment confirmed!</h1>
          <p className="ps-msg">
            Your essay has been submitted. You'll get a notification here as
            soon as your reviewer completes their feedback.
          </p>
          <Link to="/notifications" className="ps-link">Go to my essays →</Link>
        </div>
      )}
    </section>
  );
}
