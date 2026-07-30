import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

// The detailed page for a single reviewer, opened from a card.
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
    return () => {
      active = false;
    };
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
    <section className="page page-wide">
      <p>
        <Link to="/applicant">← Back to reviewers</Link>
      </p>

      <div className="detail-head">
        <Avatar url={reviewer.avatar_url} name={reviewer.full_name} size={96} />
        <div>
          <h1>{reviewer.full_name || "Reviewer"}</h1>
          <p className="muted">
            {[reviewer.college, reviewer.major].filter(Boolean).join(" · ") ||
              "—"}
          </p>
          {reviewer.age != null && <p className="muted">Age {reviewer.age}</p>}
          <p className="price">
            {reviewer.price != null
              ? `$${reviewer.price} per essay`
              : "Price not set"}
          </p>
        </div>
      </div>

      <h2>About</h2>
      <p>{reviewer.long_bio || reviewer.bio || "No details yet."}</p>

      {profile?.role === "applicant" && (
        <div className="request-box">
          {justRequested ? (
            <p className="notice">Request sent! The reviewer will be in touch.</p>
          ) : (
            <button type="button" onClick={() => navigate(`/reviewers/${id}/request`)}>
              Request a review
            </button>
          )}
        </div>
      )}
    </section>
  );
}
