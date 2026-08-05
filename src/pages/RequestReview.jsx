import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import extractEssayText from "../lib/extractEssayText.js";

const ESSAY_TYPE_LABELS = {
  personal_statement: "Common App / Personal Statement",
  supplemental:       "Supplemental Essay",
  scholarship:        "Scholarship Essay",
  other:              "Other",
};

export default function RequestReview() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [reviewer, setReviewer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [essayText, setEssayText]   = useState("");
  const [essayFile, setEssayFile]   = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [fileNotice, setFileNotice] = useState("");
  const [essayType, setEssayType]   = useState("");
  const [notes, setNotes]           = useState("");
  const [dragging, setDragging]     = useState(false);
  const [status, setStatus]         = useState(
    searchParams.get("cancelled") === "1"
      ? "Payment was cancelled — your essay hasn't been submitted yet."
      : ""
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (!error) setReviewer(data);
        setLoading(false);
      });
  }, [id]);

  // Cancelled checkout: remove the unpaid row created before the redirect so
  // it can't linger in the database as a ghost submission.
  useEffect(() => {
    const cancelledId = searchParams.get("request_id");
    if (searchParams.get("cancelled") !== "1" || !cancelledId) return;
    supabase
      .from("requests")
      .delete()
      .eq("id", cancelledId)
      .eq("applicant_id", user.id)
      .eq("payment_status", "unpaid")
      .then(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  async function pickFile(file) {
    if (!file) return;
    setFileNotice("");
    setExtracting(true);
    try {
      const text = await extractEssayText(file);
      setEssayText(text);
      setEssayFile(file);
      setFileNotice(`Text pulled from ${file.name} — look it over below and edit anything that came through oddly.`);
    } catch (err) {
      setEssayFile(null);
      setFileNotice(`Error: ${err.message}`);
    }
    setExtracting(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!essayText.trim()) { setStatus("Error: Please paste or upload your essay."); return; }
    if (!essayType)        { setStatus("Error: Please select an essay type."); return; }
    if (!notes.trim())     { setStatus("Error: Please fill in the details for your reviewer."); return; }

    setSubmitting(true);

    // Upload file if provided
    let fileUrl = null;
    let fileName = null;
    if (essayFile) {
      setStatus("Uploading essay…");
      const ext = essayFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("essays")
        .upload(path, essayFile, { upsert: false });
      if (uploadError) { setStatus("Error: " + uploadError.message); setSubmitting(false); return; }
      fileUrl = supabase.storage.from("essays").getPublicUrl(path).data.publicUrl;
      fileName = essayFile.name;
    }

    setStatus("Creating your submission…");
    // Insert request as unpaid — payment step comes next
    const { data: req, error: insertErr } = await supabase
      .from("requests")
      .insert({
        applicant_id:   user.id,
        reviewer_id:    id,
        status:         "accepted",
        payment_status: "unpaid",
        essay_text:     essayText.trim(),
        essay_url:      fileUrl,
        essay_name:     fileName,
        essay_type:     essayType,
        notes:          notes || null,
      })
      .select()
      .single();

    if (insertErr) { setStatus("Error: " + insertErr.message); setSubmitting(false); return; }

    // Ask Vercel function to create a Stripe Checkout session
    setStatus("Redirecting to payment…");
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;

    const resp = await fetch("/api/create-checkout-session", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        request_id:  req.id,
        reviewer_id: id,
        essay_type:  ESSAY_TYPE_LABELS[essayType] ?? essayType,
      }),
    });

    const json = await resp.json();
    if (!resp.ok || !json.url) {
      setStatus("Error: " + (json.error ?? "Failed to start payment."));
      setSubmitting(false);
      return;
    }

    // Hard-navigate to Stripe hosted checkout
    window.location.href = json.url;
  }

  if (loading) return <p className="page">Loading…</p>;
  if (!reviewer) return <p className="page">Reviewer not found. <Link to="/applicant">Back to reviewers</Link></p>;
  if (!reviewer.stripe_onboarded) return (
    <p className="page">
      {reviewer.full_name || "This reviewer"} isn&apos;t accepting submissions yet.{" "}
      <Link to="/applicant">Back to reviewers</Link>
    </p>
  );

  const price = reviewer.price ?? 0;

  // Applicant covers Stripe's processing fee (2.9% + 30¢), grossed up because
  // Stripe takes its cut of the total. Must match api/create-checkout-session.js.
  const priceCents = Math.round(price * 100);
  const totalCents = Math.ceil((priceCents + 30) / (1 - 0.029));
  const feeCents   = totalCents - priceCents;
  const fmt = (c) => (c / 100).toFixed(2);

  return (
    <section className="request-review-page">
      <div className="rrl-page-header">
        <Link to={`/reviewers/${id}`} className="back-link">← Back to {reviewer.full_name || "reviewer"}</Link>
        <h1 className="rrl-page-title">Submit Your Essay</h1>
      </div>

      <div className="request-review-layout">

        {/* Form */}
        <form className="rrl-form" onSubmit={handleSubmit}>

          {/* Section 1 — Essay */}
          <div className="rrl-section">

            <div className="rrl-field">
              <span className="rrl-field-label">
                Paste your essay
                {wordCount > 0 && <span className="rrl-word-count"> · {wordCount} words</span>}
              </span>
              <textarea
                className="rrl-essay-input"
                rows={14}
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="Paste the full text of your essay here…"
              />
            </div>

            <div
              className={`rrl-dropzone rrl-dropzone--slim${dragging ? " rrl-dropzone--drag" : ""}${essayFile ? " rrl-dropzone--chosen" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {essayFile ? (
                <div className="rrl-file-chosen">
                  <svg className="rrl-file-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div className="rrl-file-meta">
                    <span className="rrl-file-name">{essayFile.name}</span>
                    <span className="rrl-file-size">{(essayFile.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button type="button" className="rrl-file-remove" onClick={() => { setEssayFile(null); setFileNotice(""); }}>Remove</button>
                </div>
              ) : (
                <label className="rrl-dropzone-inner rrl-dropzone-inner--slim">
                  <span className="rrl-dropzone-text">
                    {extracting
                      ? "Reading your file…"
                      : <>Or drop a file here to fill the box for you — <span className="rrl-dropzone-browse">browse</span></>}
                  </span>
                  <span className="rrl-dropzone-hint">.docx, .pdf, or .txt</span>
                  <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} hidden disabled={extracting} />
                </label>
              )}
            </div>

            {fileNotice && (
              <p className={`notice${fileNotice.startsWith("Error") ? " error" : ""}`} style={{ marginTop: 0 }}>
                {fileNotice.replace(/^Error: /, "")}
              </p>
            )}

            <label className="rrl-field">
              <span className="rrl-field-label">Essay type</span>
              <select value={essayType} onChange={(e) => setEssayType(e.target.value)}>
                <option value="">Select a type</option>
                <option value="personal_statement">Common App / Personal Statement</option>
                <option value="supplemental">Supplemental Essay</option>
                <option value="scholarship">Scholarship Essay</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          {/* Section 2 — Details */}
          <div className="rrl-section">
            <div className="rrl-field">
              <span className="rrl-field-label">What should the reviewer focus on?</span>
              <textarea
                rows={5}
                maxLength={600}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Does my story feel authentic? Is the structure clear? Are there any sections that feel weak or unclear?"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="rrl-submit-row">
            <button type="submit" className="rrl-submit-btn" disabled={submitting || extracting}>
              {submitting ? status.replace(/^Error: /, "") || "Processing…" : `Pay $${fmt(totalCents)} & Submit`}
            </button>
            {status && (
              <p className={`notice${status.startsWith("Error") ? " error" : ""}`}>
                {status.replace(/^Error: /, "")}
              </p>
            )}
          </div>
        </form>

        {/* Price summary sidebar */}
        <div className="rrl-price-col">
          <aside className="rrl-price-card">
            <p className="rrl-price-label">Review fee</p>
            <p className="rrl-price-amount">${price}</p>
            <div className="rrl-price-breakdown">
              <span>Processing fee</span>
              <span>${fmt(feeCents)}</span>
            </div>
            <div className="rrl-price-breakdown rrl-price-breakdown--total">
              <span>Total</span>
              <span>${fmt(totalCents)}</span>
            </div>
            <p className="rrl-price-note">
              Charged once via Stripe. Your essay will be visible to{" "}
              {reviewer.full_name || "the reviewer"} immediately after payment.
            </p>
            <div className="rrl-price-divider" />
            <p className="rrl-price-secure">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Secure payment via Stripe
            </p>
          </aside>
        </div>

      </div>
    </section>
  );
}
