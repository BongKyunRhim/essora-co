import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../app/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";

// pdf.js is heavy — load the viewer only when a reviewer opens the workspace
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

const MIN_SUGGESTIONS = 6;

function StarRow({ value, onChange, readOnly }) {
  return (
    <div className="rw-stars" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`rw-star${n <= (value || 0) ? " rw-star--on" : ""}`}
          disabled={readOnly}
          onClick={() => onChange(n)}
          aria-label={`${n} out of 5`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={n <= (value || 0) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
      <span className="rw-star-value">{value ? `${value}/5` : ""}</span>
    </div>
  );
}

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [request, setRequest]     = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState(false);

  // Review state
  const [suggestions, setSuggestions]   = useState([]);
  const [ratings, setRatings]           = useState({});
  const [finalComment, setFinalComment] = useState("");
  const [submitted, setSubmitted]       = useState(false);
  const [activeId, setActiveId]         = useState(null);
  const [saveState, setSaveState]       = useState("");   // "", "saving", "saved"
  const [submitError, setSubmitError]   = useState("");
  const [manualOpen, setManualOpen]     = useState(false);
  const [manualText, setManualText]     = useState("");
  const hydrated = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: req } = await supabase
        .from("requests").select("*").eq("id", id).single();
      if (!active || !req) { setLoading(false); return; }
      setRequest(req);

      const [{ data: app }, { data: rev }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", req.applicant_id).single(),
        supabase.from("reviews").select("*").eq("request_id", id).maybeSingle(),
      ]);
      if (!active) return;
      setApplicant(app);
      if (rev) {
        setSuggestions(rev.suggestions ?? []);
        setRatings(rev.ratings ?? {});
        setFinalComment(rev.final_comment ?? "");
        setSubmitted(!!rev.submitted);
      }
      setLoading(false);
      // let the first render settle before autosave arms itself
      setTimeout(() => { hydrated.current = true; }, 0);
    })();
    return () => { active = false; };
  }, [id]);

  /* ---- Draft autosave (debounced) ---- */
  useEffect(() => {
    if (!hydrated.current || submitted || !request) return;
    clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from("reviews").upsert({
        request_id:    request.id,
        reviewer_id:   user.id,
        suggestions,
        ratings,
        final_comment: finalComment || null,
        submitted:     false,
      }, { onConflict: "request_id" });
      setSaveState(error ? "" : "saved");
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [suggestions, ratings, finalComment]); // eslint-disable-line react-hooks/exhaustive-deps

  function addSuggestion(draft) {
    const s = {
      id: `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      ...draft,
    };
    setSuggestions((list) => [...list, s]);
    setActiveId(s.id);
  }

  function deleteSuggestion(sid) {
    setSuggestions((list) => list.filter((s) => s.id !== sid));
    if (activeId === sid) setActiveId(null);
  }

  function jumpToSuggestion(s) {
    setActiveId(s.id);
    if (s.rects?.length) {
      document.querySelector(`[data-hl-id="${s.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function addManualSuggestion() {
    if (!manualText.trim()) return;
    addSuggestion({ page: null, quote: null, rects: null, comment: manualText.trim() });
    setManualText("");
    setManualOpen(false);
  }

  const missing = [];
  if (suggestions.length < MIN_SUGGESTIONS)
    missing.push(`${MIN_SUGGESTIONS - suggestions.length} more suggestion${MIN_SUGGESTIONS - suggestions.length === 1 ? "" : "s"}`);
  const unrated = RATING_CATEGORIES.filter((c) => !ratings[c.key]);
  if (unrated.length) missing.push(`${unrated.length} rating${unrated.length === 1 ? "" : "s"}`);
  if (!finalComment.trim()) missing.push("a final comment");

  async function submitReview() {
    if (missing.length) return;
    setUpdating(true);
    setSubmitError("");
    const { error } = await supabase.from("reviews").upsert({
      request_id:    request.id,
      reviewer_id:   user.id,
      suggestions,
      ratings,
      final_comment: finalComment.trim(),
      submitted:     true,
    }, { onConflict: "request_id" });
    if (error) { setSubmitError(error.message); setUpdating(false); return; }
    await supabase.from("requests").update({ status: "completed" }).eq("id", id);
    setRequest((r) => ({ ...r, status: "completed" }));
    setSubmitted(true);
    setUpdating(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Fire-and-forget payout — if reviewer hasn't connected Stripe it skips silently
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        fetch("/api/payout-reviewer", {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ request_id: id }),
        }).catch(() => {});
      }
    });
  }

  if (loading) return <p className="page">Loading…</p>;
  if (!request) return (
    <p className="page">Submission not found. <Link to="/notifications">Back to submissions</Link></p>
  );

  const school = [applicant?.college, applicant?.major].filter(Boolean).join(" · ")
    || applicant?.high_school;
  // Submissions go straight into review — every submission opens the workspace.
  const statusLabel = request.status === "completed" ? "completed" : "in review";

  return (
    <section className="request-detail-page">
      <Link to="/notifications" className="back-link">← Back to submissions</Link>

      {submitted && (
        <div className="rw-submitted-banner">
          <strong>Review submitted.</strong> {applicant?.full_name || "The applicant"} can now see your feedback.
        </div>
      )}

      {/* Applicant header */}
      <div className="rdp-header">
        <Avatar url={applicant?.avatar_url} name={applicant?.full_name} size={72} />
        <div className="rdp-header-info">
          <h1 className="rdp-name">{applicant?.full_name || "Applicant"}</h1>
          {school && <p className="rdp-school">{school}</p>}
          {applicant?.age != null && (
            <span className="rdl-age-tag">Grade {applicant.age}</span>
          )}
        </div>
        <span className={`rdp-status-tag rdp-status-tag--${request.status === "completed" ? "completed" : "accepted"}`}>
          {statusLabel}
        </span>
      </div>

      {/* Applicant profile details */}
      {(applicant?.bio || applicant?.intended_major || applicant?.dream_schools) && (
        <div className="rw-applicant-card">
          <h2 className="rdp-section-label">About the Applicant</h2>
          {applicant?.bio && <p className="rw-applicant-bio">{applicant.bio}</p>}
          <div className="rw-applicant-meta">
            {applicant?.intended_major && (
              <div className="rdp-meta-row">
                <span className="rdp-meta-key">Intended major</span>
                <span className="rdp-meta-val">{applicant.intended_major}</span>
              </div>
            )}
            {applicant?.dream_schools && (
              <div className="rdp-meta-row">
                <span className="rdp-meta-key">College list</span>
                <span className="rdp-meta-val">{applicant.dream_schools}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rdp-divider" />

      <div className="rdp-body">

        {/* Essay meta */}
        <div className="rdp-section">
          <h2 className="rdp-section-label">Essay</h2>
          {request.essay_type && (
            <div className="rdp-meta-row">
              <span className="rdp-meta-key">Type</span>
              <span className="rdp-meta-val">
                {ESSAY_TYPE_LABELS[request.essay_type] ?? request.essay_type}
              </span>
            </div>
          )}
          {request.essay_name && (
            <div className="rdp-meta-row">
              <span className="rdp-meta-key">File</span>
              <span className="rdp-meta-val">{request.essay_name}</span>
            </div>
          )}
          {request.essay_url && (
            <a href={request.essay_url} target="_blank" rel="noopener noreferrer" className="rdp-download-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Essay
            </a>
          )}
        </div>

        {/* Notes from applicant */}
        {request.notes && (
          <div className="rdp-section">
            <h2 className="rdp-section-label">Message from Applicant</h2>
            <p className="rdp-notes">{request.notes}</p>
          </div>
        )}

      </div>

      {/* ---- Review workspace ---- */}
      {(request.essay_text || request.essay_url) && (
        <>
          <div className="rdp-divider" />

          <div className="rw-workspace">
            <div className="rw-essay-head">
              <h2 className="rdp-section-label">The Essay</h2>
              {!submitted && (
                <p className="rw-hint">
                  Highlight any passage in the essay to attach a suggestion to it.
                </p>
              )}
            </div>

            <div className="rw-suggestions-head">
              <h2 className="rdp-section-label">Suggestions</h2>
              <span className={`rw-count${suggestions.length >= MIN_SUGGESTIONS ? " rw-count--ok" : ""}`}>
                {suggestions.length} / {MIN_SUGGESTIONS} minimum
              </span>
            </div>

            <div className="rw-essay-body">
              <Suspense fallback={<p className="ev-status">Loading essay…</p>}>
                <EssayViewer
                  url={request.essay_url}
                  name={request.essay_name}
                  text={request.essay_text}
                  highlights={suggestions}
                  activeId={activeId}
                  readOnly={submitted}
                  onCreate={addSuggestion}
                  onHighlightClick={(hid) => setActiveId(hid)}
                />
              </Suspense>
            </div>

            {/* Suggestions panel */}
            <aside className="rw-suggestions">
              {suggestions.length === 0 && (
                <p className="rw-empty">
                  No suggestions yet. Select text in the essay to add your first one.
                </p>
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
                      {!submitted && (
                        <button
                          type="button"
                          className="rw-suggestion-delete"
                          onClick={(e) => { e.stopPropagation(); deleteSuggestion(s.id); }}
                          aria-label="Delete suggestion"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {s.quote && <p className="rw-suggestion-quote">“{s.quote}”</p>}
                    <p className="rw-suggestion-comment">{s.comment}</p>
                  </li>
                ))}
              </ul>

              {!submitted && !manualOpen && (
                <button type="button" className="rw-manual-btn" onClick={() => setManualOpen(true)}>
                  + Add a general suggestion
                </button>
              )}
              {!submitted && manualOpen && (
                <div className="rw-manual-form">
                  <textarea
                    autoFocus
                    rows={3}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="A suggestion that isn't tied to one passage…"
                  />
                  <div className="ev-composer-actions">
                    <button type="button" className="ev-composer-save" disabled={!manualText.trim()} onClick={addManualSuggestion}>
                      Add
                    </button>
                    <button type="button" className="linklike" onClick={() => { setManualOpen(false); setManualText(""); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </div>

          {/* Ratings + final comments + submit, unified in one card */}
          <div className="rw-review-card">
            <div className="rw-ratings">
              <h2 className="rdp-section-label">Rate this Essay</h2>
              <div className="rw-rating-grid">
                {RATING_CATEGORIES.map((c) => (
                  <div key={c.key} className="rw-rating-row">
                    <span className="rw-rating-label">{c.label}</span>
                    <StarRow
                      value={ratings[c.key]}
                      readOnly={submitted}
                      onChange={(v) => setRatings((r) => ({ ...r, [c.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rw-final">
              <h2 className="rdp-section-label">Final Comments</h2>
              <textarea
                rows={5}
                maxLength={2000}
                value={finalComment}
                readOnly={submitted}
                onChange={(e) => setFinalComment(e.target.value)}
                placeholder="Wrap up your review — overall impressions, the essay's biggest strength, and the one thing to focus on next."
              />
            </div>

            {!submitted && (
              <div className="rw-submit-row">
                <button type="button" disabled={updating || missing.length > 0} onClick={submitReview}>
                  Submit Review
                </button>
                <div className="rw-submit-side">
                  {missing.length > 0 && (
                    <p className="rw-missing">Still needed: {missing.join(", ")}.</p>
                  )}
                  {saveState === "saved" && (
                    <p className="rw-saved">Draft saved automatically.</p>
                  )}
                  {submitError && <p className="notice error">{submitError}</p>}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
