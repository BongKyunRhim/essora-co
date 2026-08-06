import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

const ESSAY_TYPE_LABELS = {
  personal_statement: "Common App / Personal Statement",
  supplemental:       "Supplemental Essay",
  scholarship:        "Scholarship Essay",
  other:              "Other",
};

const STATUS_LABEL = {
  pending:   "In review",
  accepted:  "In review",
  declined:  "Declined",
  completed: "Feedback ready",
  expired:   "Expired — refunded",
};

const STATUS_CLASS = {
  pending:   "pending",
  accepted:  "pending",
  declined:  "declined",
  completed: "accepted",
  expired:   "declined",
};

export default function SubmissionStatus() {
  const { id } = useParams();
  const { user } = useAuth();
  const [req, setReq]         = useState(null);
  const [reviewer, setReviewer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("requests")
      .select("*")
      .eq("id", id)
      .eq("applicant_id", user.id)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { setLoading(false); return; }
        setReq(data);
        const { data: rev } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.reviewer_id)
          .single();
        setReviewer(rev);
        setLoading(false);
      });
  }, [id, user.id]);

  if (loading) return <p className="page">Loading…</p>;
  if (!req)    return <p className="page">Submission not found. <Link to="/notifications">Back</Link></p>;

  const statusClass = STATUS_CLASS[req.status] ?? req.status;
  const statusLabel = STATUS_LABEL[req.status] ?? req.status;
  const essayTypeLabel = ESSAY_TYPE_LABELS[req.essay_type] ?? req.essay_type;

  return (
    <section className="submission-status-page page">
      <h1 className="rn-title">Submission Status</h1>

      <Link to="/notifications" className="back-link">← Back to Notifications</Link>

      <div className="ss-card">
        {/* Header row */}
        <div className="ss-header">
          <div className="ss-reviewer-info">
            <Avatar url={reviewer?.avatar_url} name={reviewer?.full_name} size={52} />
            <div>
              <p className="ss-reviewer-name">{reviewer?.full_name || "Your reviewer"}</p>
              <p className="ss-submitted-date">
                Submitted{" "}
                {new Date(req.created_at).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
          </div>
          <span className={`rn-status rn-status--${statusClass}`}>{statusLabel}</span>
        </div>

        <div className="ss-divider" />

        {/* Meta */}
        {essayTypeLabel && (
          <div className="ss-meta-row">
            <span className="ss-meta-label">Essay type</span>
            <span className="ss-meta-value">{essayTypeLabel}</span>
          </div>
        )}

        {/* Status message */}
        <div className="ss-status-message">
          {req.status === "declined" ? (
            <p>This submission was declined by the reviewer.</p>
          ) : req.status === "expired" ? (
            <p>
              Your reviewer didn&apos;t complete this review within 3 days, so
              your full payment was automatically refunded.{" "}
              <Link to="/applicant">Find another reviewer →</Link>
            </p>
          ) : req.status === "completed" ? (
            <p>Your feedback is ready. <Link to={`/feedback/${req.id}`}>View feedback →</Link></p>
          ) : (
            <p>Your essay is currently being reviewed. You'll be notified here when feedback is ready.</p>
          )}
        </div>

        <div className="ss-divider" />

        {/* Essay text */}
        <div className="ss-essay-section">
          <p className="ss-section-label">Your essay</p>
          {req.essay_name && (
            <p className="ss-file-name">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {req.essay_name}
            </p>
          )}
          <pre className="ss-essay-text">{req.essay_text}</pre>
        </div>

        {/* Notes */}
        {req.notes && (
          <>
            <div className="ss-divider" />
            <div className="ss-essay-section">
              <p className="ss-section-label">What you asked the reviewer to focus on</p>
              <p className="ss-notes-text">{req.notes}</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
