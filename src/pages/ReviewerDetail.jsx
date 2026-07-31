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

      <div className="reviewer-detail-layout">

        {/* Left: profile info */}
        <div className="reviewer-detail-left">
          <div className="rdl-avatar-wrap">
            <Avatar url={reviewer.avatar_url} name={reviewer.full_name} size={200} />
          </div>

          <div className="rdl-identity">
            <h1 className="rdl-name">{reviewer.full_name || "Reviewer"}</h1>
            {school && <p className="rdl-school">{school}</p>}
            {reviewer.age != null && (
              <span className="rdl-age-tag">Age {reviewer.age}</span>
            )}
          </div>

          {reviewer.price != null && (
            <div className="rdl-price-card">
              <span className="rdl-price-label">Review fee</span>
              <div className="rdl-price-value">
                ${reviewer.price}<span className="rdl-price-unit"> / essay</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: about + request */}
        <div className="reviewer-detail-right">
          <div className="reviewer-about-box">
            <h2>About</h2>
            <p>{reviewer.long_bio || reviewer.bio || "This reviewer hasn't added a bio yet."}</p>
          </div>

          {profile?.role === "applicant" && (
            <div className="reviewer-detail-actions">
              {justRequested ? (
                <p className="notice">Request sent! The reviewer will be in touch.</p>
              ) : (
                <button
                  type="button"
                  className="rdl-request-btn"
                  onClick={() => navigate(`/reviewers/${id}/request`)}
                >
                  Request a Review
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
