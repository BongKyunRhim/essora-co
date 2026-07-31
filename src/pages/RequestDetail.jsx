import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

const ESSAY_TYPE_LABELS = {
  personal_statement: "Common App / Personal Statement",
  supplemental:       "Supplemental Essay",
  scholarship:        "Scholarship Essay",
  other:              "Other",
};

export default function RequestDetail() {
  const { id } = useParams();
  const [request, setRequest]   = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("requests")
      .select("*")
      .eq("id", id)
      .single()
      .then(async ({ data: req }) => {
        if (!active || !req) { setLoading(false); return; }
        setRequest(req);
        const { data: app } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", req.applicant_id)
          .single();
        if (active) { setApplicant(app); setLoading(false); }
      });
    return () => { active = false; };
  }, [id]);

  async function updateStatus(status) {
    setUpdating(true);
    await supabase.from("requests").update({ status }).eq("id", id);
    setRequest((r) => ({ ...r, status }));
    setUpdating(false);
  }

  if (loading) return <p className="page">Loading…</p>;
  if (!request) return (
    <p className="page">Request not found. <Link to="/notifications">Back to requests</Link></p>
  );

  const school = [applicant?.college, applicant?.major].filter(Boolean).join(" · ")
    || applicant?.high_school;

  return (
    <section className="request-detail-page">
      <Link to="/notifications" className="back-link">← Back to requests</Link>

      {/* Applicant header */}
      <div className="rdp-header">
        <Avatar url={applicant?.avatar_url} name={applicant?.full_name} size={72} />
        <div className="rdp-header-info">
          <h1 className="rdp-name">{applicant?.full_name || "Applicant"}</h1>
          {school && <p className="rdp-school">{school}</p>}
          {applicant?.age != null && (
            <span className="rdl-age-tag">Age {applicant.age}</span>
          )}
        </div>
        <span className={`rdp-status-tag rdp-status-tag--${request.status}`}>
          {request.status}
        </span>
      </div>

      <div className="rdp-divider" />

      <div className="rdp-body">

        {/* Essay section */}
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
            <a
              href={request.essay_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rdp-download-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Essay
            </a>
          )}
        </div>

        {/* Notes */}
        {request.notes && (
          <div className="rdp-section">
            <h2 className="rdp-section-label">Message from Applicant</h2>
            <p className="rdp-notes">{request.notes}</p>
          </div>
        )}

        {/* Actions */}
        {request.status === "pending" && (
          <div className="rdp-actions">
            <button
              type="button"
              disabled={updating}
              onClick={() => updateStatus("accepted")}
            >
              Accept request
            </button>
            <button
              type="button"
              className="linklike"
              disabled={updating}
              onClick={() => updateStatus("declined")}
            >
              Decline
            </button>
          </div>
        )}

        {request.status !== "pending" && (
          <p className="notice">
            {request.status === "accepted"
              ? "You accepted this request."
              : "You declined this request."}
          </p>
        )}

      </div>
    </section>
  );
}
