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

  const [essayFile, setEssayFile] = useState(null);
  const [essayType, setEssayType] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
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

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEssayFile(file);
    setStatus("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!essayFile) { setStatus("Error: Please upload your essay."); return; }

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
      applicant_id: user.id,
      reviewer_id: id,
      essay_url: urlData.publicUrl,
      essay_name: essayFile.name,
      essay_type: essayType || null,
      notes: notes || null,
    });

    setSubmitting(false);
    if (error) { setStatus("Error: " + error.message); return; }

    navigate(`/reviewers/${id}`, { state: { requested: true } });
  }

  if (loading) return <p className="page">Loading…</p>;
  if (!reviewer) return <p className="page">Reviewer not found. <Link to="/applicant">Back to reviewers</Link></p>;

  return (
    <section className="page request-review-page">
      <p><Link to={`/reviewers/${id}`}>← Back to {reviewer.full_name || "reviewer"}</Link></p>

      <div className="request-review-header">
        <Avatar url={reviewer.avatar_url} name={reviewer.full_name} size={56} />
        <div>
          <h1>Request a review</h1>
          <p className="muted">
            from {reviewer.full_name}
            {reviewer.price != null ? ` · $${reviewer.price} per essay` : ""}
          </p>
        </div>
      </div>

      <form className="form request-review-form" onSubmit={handleSubmit}>
        <div className="field">
          <span className="field-label">Upload your essay <span className="field-hint-inline">(PDF, Word, or plain text)</span></span>
          {essayFile ? (
            <div className="essay-file-chosen">
              <span className="essay-file-name">{essayFile.name}</span>
              <button type="button" className="link-btn" onClick={() => setEssayFile(null)}>Remove</button>
            </div>
          ) : (
            <label className="essay-upload-btn">
              Choose file
              <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFile} hidden />
            </label>
          )}
        </div>

        <label className="field">
          <span>Essay type <span className="field-hint-inline">(optional)</span></span>
          <select value={essayType} onChange={(e) => setEssayType(e.target.value)}>
            <option value="">Select a type</option>
            <option value="personal_statement">Common App Personal Statement</option>
            <option value="supplemental">Supplemental Essay</option>
            <option value="scholarship">Scholarship Essay</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="field">
          <span>What would you like the reviewer to focus on? <span className="field-hint-inline">(optional)</span></span>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Does my story feel authentic? Is the structure clear? Are there any sections that feel weak or unclear?"
          />
        </label>

        <div className="request-review-footer">
          <button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send request"}
          </button>
          {status && (
            <p className={`notice${status.startsWith("Error") ? " error" : ""}`}>{status}</p>
          )}
        </div>
      </form>
    </section>
  );
}
