import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../app/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";

// Same lazy split as the reviewer workspace — pdf.js only loads on demand.
const EssayViewer = lazy(() => import("../components/EssayViewer.jsx"));

const ESSAY_TYPE_LABELS = {
  personal_statement: "Common App / Personal Statement",
  supplemental:       "Supplemental Essay",
  scholarship:        "Scholarship Essay",
  other:              "Other",
};

const RATING_CATEGORIES = [
  { key: "grammar",      label: "Grammar & Mechanics" },
  { key: "clarity",      label: "Clarity & Flow" },
  { key: "storytelling", label: "Storytelling" },
  { key: "voice",        label: "Voice & Authenticity" },
  { key: "impact",       label: "Overall Impact" },
];

function StarDisplay({ value }) {
  return (
    <div className="rw-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`rw-star${n <= (value || 0) ? " rw-star--on" : ""}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={n <= (value || 0) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </span>
      ))}
      <span className="rw-star-value">{value ? `${value}/5` : "—"}</span>
    </div>
  );
}

export default function ApplicantFeedback() {
  const { id } = useParams();
  const { user } = useAuth();
  const [request, setRequest]   = useState(null);
  const [review, setReview]     = useState(null);
  const [reviewer, setReviewer] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: req } = await supabase
        .from("requests").select("*").eq("id", id).single();
      if (!active || !req || req.applicant_id !== user.id) { setLoading(false); return; }
      setRequest(req);

      const [{ data: rev }, { data: prof }] = await Promise.all([
        supabase.from("reviews").select("*").eq("request_id", id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", req.reviewer_id).single(),
      ]);
      if (!active) return;
      setReview(rev);
      setReviewer(prof);
      setLoading(false);

      // Clear the "new feedback" state so the bell badge goes away.
      if (rev?.submitted && !req.applicant_seen) {
        supabase.from("requests").update({ applicant_seen: true }).eq("id", id)
          .then(() => {});
      }
    })();
    return () => { active = false; };
  }, [id, user.id]);

  function jumpToSuggestion(s) {
    setActiveId(s.id);
    if (s.rects?.length) {
      document.querySelector(`[data-hl-id="${s.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  if (loading) return <p className="page">Loading…</p>;
  if (!request) return (
    <p className="page">Feedback not found. <Link to="/notifications">Back to my essays</Link></p>
  );
  if (!review?.submitted) return (
    <p className="page">
      This review isn't finished yet — you'll see the feedback here as soon as{" "}
      {reviewer?.full_name || "your reviewer"} submits it.{" "}
      <Link to="/notifications">Back to my essays</Link>
    </p>
  );

  const school = [reviewer?.college, reviewer?.major].filter(Boolean).join(" · ");
  const suggestions = review.suggestions ?? [];
  const ratings = review.ratings ?? {};

  return (
    <section className="request-detail-page">
      <Link to="/notifications" className="back-link">← Back to my essays</Link>

      {/* Reviewer header */}
      <div className="rdp-header">
        <Avatar url={reviewer?.avatar_url} name={reviewer?.full_name} size={72} />
        <div className="rdp-header-info">
          <h1 className="rdp-name">Feedback from {reviewer?.full_name || "your reviewer"}</h1>
          {school && <p className="rdp-school">{school}</p>}
          {request.essay_type && (
            <span className="rdl-age-tag">
              {ESSAY_TYPE_LABELS[request.essay_type] ?? request.essay_type}
            </span>
          )}
        </div>
        <span className="rdp-status-tag rdp-status-tag--completed">completed</span>
      </div>

      <div className="rdp-divider" />

      {/* Essay with the reviewer's highlights + their suggestions beside it */}
      <div className="rw-workspace">
        <div className="rw-essay-col">
          <div className="rw-essay-head">
            <h2 className="rdp-section-label">Your Essay</h2>
            <p className="rw-hint">
              Highlighted passages have a suggestion attached — click one to see it.
            </p>
          </div>
          <Suspense fallback={<p className="ev-status">Loading essay…</p>}>
            <EssayViewer
              url={request.essay_url}
              name={request.essay_name}
              text={request.essay_text}
              highlights={suggestions}
              activeId={activeId}
              readOnly
              onHighlightClick={(hid) => setActiveId(hid)}
            />
          </Suspense>
        </div>

        <aside className="rw-suggestions">
          <div className="rw-suggestions-head">
            <h2 className="rdp-section-label">Suggestions</h2>
            <span className="rw-count rw-count--ok">
              {suggestions.length} total
            </span>
          </div>

          {suggestions.length === 0 && (
            <p className="rw-empty">No individual suggestions were left on this essay.</p>
          )}

          <ul className="rw-suggestion-list">
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                className={`rw-suggestion${s.id === activeId ? " rw-suggestion--active" : ""}`}
                onClick={() => jumpToSuggestion(s)}
              >
                <div className="rw-suggestion-top">
                  <span className="rw-suggestion-num">{i + 1}</span>
                  {s.page && <span className="rw-suggestion-page">p. {s.page}</span>}
                </div>
                {s.quote && <p className="rw-suggestion-quote">“{s.quote}”</p>}
                <p className="rw-suggestion-comment">{s.comment}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Ratings + final comments */}
      <div className="rw-review-card">
        <div className="rw-ratings">
          <h2 className="rdp-section-label">Ratings</h2>
          <div className="rw-rating-grid">
            {RATING_CATEGORIES.map((c) => (
              <div key={c.key} className="rw-rating-row">
                <span className="rw-rating-label">{c.label}</span>
                <StarDisplay value={ratings[c.key]} />
              </div>
            ))}
          </div>
        </div>

        {review.final_comment && (
          <div className="rw-final">
            <h2 className="rdp-section-label">Final Comments</h2>
            <p className="rdp-notes">{review.final_comment}</p>
          </div>
        )}
      </div>
    </section>
  );
}
