import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

export default function ReviewerDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reviewer, setReviewer] = useState(null);
  const [loading, setLoading] = useState(true);
  const justRequested = location.state?.requested === true;

  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!active) return;
        setReviewer(data ?? null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  if (loading) return <p className="page">Loading…</p>;
  if (!reviewer) {
    return (
      <p className="page">
        Reviewer not found. <Link to="/applicant">Back to reviewers</Link>
      </p>
    );
  }

  const school = [reviewer.college, reviewer.major].filter(Boolean).join(" · ");

  return (
    <section className="reviewer-detail">
      <Link to="/applicant" className="back-link">← Back to Reviewers</Link>

      <div className="rdl-header">
        <Avatar url={reviewer.avatar_url} name={reviewer.full_name} size={160} />
        <div className="rdl-header-info">
          <h1 className="rdl-name">{reviewer.full_name || "Reviewer"}</h1>
          {school && <p className="rdl-school">{school}</p>}
          <div className="rdl-meta-row">
            {reviewer.age != null && (
              <span className="rdl-age-tag">Age {reviewer.age}</span>
            )}
            {reviewer.price != null && (
              <span className="rdl-price-inline">
                ${reviewer.price}<span className="rdl-price-unit"> / essay</span>
              </span>
            )}
          </div>
        </div>
        {profile?.role === "applicant" && (
          justRequested ? (
            <p className="notice">Request sent! The reviewer will be in touch.</p>
          ) : (
            <button
              type="button"
              className="rdl-request-btn"
              onClick={() => navigate(`/reviewers/${id}/request`)}
            >
              Request a Review
            </button>
          )
        )}
      </div>

      <div className="rdl-divider" />

      <div className="rdl-about-section">
        <h2 className="rdl-section-label">About</h2>
        <p className="rdl-bio">
          {reviewer.long_bio || reviewer.bio || "This reviewer hasn't added a bio yet."}
        </p>
      </div>
    </section>
  );
}
