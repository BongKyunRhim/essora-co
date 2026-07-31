import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";


export default function RequestReview() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reviewer, setReviewer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [essayFile, setEssayFile]   = useState(null);
  const [essayType, setEssayType]   = useState("");
  const [notes, setNotes]           = useState("");
  const [dragging, setDragging]     = useState(false);
  const [status, setStatus]         = useState("");
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

  function pickFile(file) {
    if (!file) return;
    setEssayFile(file);
    setStatus("");
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!essayFile)  { setStatus("Error: Please upload your essay."); return; }
    if (!essayType)  { setStatus("Error: Please select an essay type."); return; }

    setSubmitting(true);
    setStatus("Uploading essay…");

    const ext = essayFile.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("essays")
      .upload(path, essayFile, { upsert: false });

    if (uploadError) { setStatus("Error: " + uploadError.message); setSubmitting(false); return; }

    const { data: urlData } = supabase.storage.from("essays").getPublicUrl(path);

    setStatus("Sending request…");
    const { error } = await supabase.from("requests").insert({
      applicant_id:  user.id,
      reviewer_id:   id,
      essay_url:     urlData.publicUrl,
      essay_name:    essayFile.name,
      essay_type:    essayType,
      notes:         notes       || null,
    });

    setSubmitting(false);
    if (error) { setStatus("Error: " + error.message); return; }

    navigate(`/reviewers/${id}`, { state: { requested: true } });
  }

  if (loading) return <p className="page">Loading…</p>;
  if (!reviewer) return <p className="page">Reviewer not found. <Link to="/applicant">Back to reviewers</Link></p>;

  return (
    <section className="request-review-page">
      <Link to={`/reviewers/${id}`} className="back-link">← Back to {reviewer.full_name || "reviewer"}</Link>

      <div className="request-review-layout">

        {/* Form */}
        <form className="rrl-form" onSubmit={handleSubmit}>
          <h1 className="rrl-form-title">Request a Review</h1>

          {/* Section 1 — Essay */}
          <div className="rrl-section">
            <h2 className="rrl-section-label">Your Essay</h2>

            <div
              className={`rrl-dropzone${dragging ? " rrl-dropzone--drag" : ""}${essayFile ? " rrl-dropzone--chosen" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {essayFile ? (
                <div className="rrl-file-chosen">
                  <svg className="rrl-file-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  <div className="rrl-file-meta">
                    <span className="rrl-file-name">{essayFile.name}</span>
                    <span className="rrl-file-size">{(essayFile.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button type="button" className="rrl-file-remove" onClick={() => setEssayFile(null)}>Remove</button>
                </div>
              ) : (
                <label className="rrl-dropzone-inner">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="16 16 12 12 8 16"/>
                    <line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                  </svg>
                  <span className="rrl-dropzone-text">
                    Drop your essay here, or <span className="rrl-dropzone-browse">browse</span>
                  </span>
                  <span className="rrl-dropzone-hint">PDF, Word, or plain text</span>
                  <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => pickFile(e.target.files?.[0])} hidden />
                </label>
              )}
            </div>

            <label className="rrl-field">
              <span className="rrl-field-label">Essay type</span>
              <select value={essayType} onChange={(e) => setEssayType(e.target.value)}>
                <option value="">Select a type</option>
                <option value="personal_statement">Common App Personal Statement</option>
                <option value="supplemental">Supplemental Essay</option>
                <option value="scholarship">Scholarship Essay</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          {/* Section 2 — Details */}
          <div className="rrl-section">
            <h2 className="rrl-section-label">Details</h2>

            <div className="rrl-field">
              <span className="rrl-field-label">What should the reviewer focus on? <span className="rrl-optional">(optional)</span></span>
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
            <button type="submit" className="rrl-submit-btn" disabled={submitting}>
              {submitting ? "Sending…" : "Send Request"}
            </button>
            {status && (
              <p className={`notice${status.startsWith("Error") ? " error" : ""}`}>{status}</p>
            )}
          </div>
        </form>

      </div>
    </section>
  );
}
