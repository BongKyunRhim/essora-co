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

  return (
    <section className="reviewer-detail">
      <Link to="/applicant" className="back-link">← Back to Reviewers</Link>

      <div className="reviewer-detail-layout">

        {/* Left: avatar + key info */}
        <div className="reviewer-detail-left">
          <Avatar url={reviewer.avatar_url} name={reviewer.full_name} size={220} />

          <div className="reviewer-detail-info">
            <div className="rdl-row">
              <span className="rdl-name">{reviewer.full_name || "Reviewer"}</span>
              {reviewer.age != null && <span className="rdl-secondary">Age {reviewer.age}</span>}
            </div>
            <div className="rdl-row">
              {reviewer.college && <span className="rdl-secondary">{reviewer.college}</span>}
              {reviewer.major  && <span className="rdl-secondary">{reviewer.major}</span>}
            </div>
            {reviewer.price != null && (
              <p className="rdl-price">${reviewer.price} / essay</p>
            )}
          </div>
        </div>

        {/* Right: about box + request button */}
        <div className="reviewer-detail-right">
          <div className="reviewer-about-box">
            <h2>About</h2>
            <p>{reviewer.long_bio || reviewer.bio || "No details yet."}</p>
          </div>

          {profile?.role === "applicant" && (
            <div className="reviewer-detail-actions">
              {justRequested ? (
                <p className="notice">Request sent! The reviewer will be in touch.</p>
              ) : (
                <button type="button" onClick={() => navigate(`/reviewers/${id}/request`)}>
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
