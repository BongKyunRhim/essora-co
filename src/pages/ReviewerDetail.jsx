import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

function StarSvg({ filled, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/* One star that can be partially filled: a gray outline star with a gold
   star clipped to the fill percentage layered on top. */
function Star({ fill, size = 16 }) {
  return (
    <span className="rr-star-wrap" style={{ width: size, height: size }}>
      <span className="rr-star-base"><StarSvg filled={false} size={size} /></span>
      {fill > 0 && (
        <span className="rr-star-fill" style={{ width: `${fill * 100}%` }}>
          <StarSvg filled size={size} />
        </span>
      )}
    </span>
  );
}

function StarRow({ value, size = 16 }) {
  // Snap to halves so 4.5 reads as four-and-a-half stars
  const shown = Math.round(value * 2) / 2;
  return (
    <span className="rr-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} fill={Math.max(0, Math.min(1, shown - (n - 1)))} size={size} />
      ))}
    </span>
  );
}

export default function ReviewerDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reviewer, setReviewer] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const justRequested = location.state?.requested === true;

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.from("reviewer_ratings").select("*").eq("reviewer_id", id)
        .order("created_at", { ascending: false }),
    ]).then(([{ data }, { data: rats }]) => {
      if (!active) return;
      setReviewer(data ?? null);
      setRatings(rats ?? []);
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
  const avg = ratings.length
    ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
    : null;

  return (
    <section className="reviewer-detail">
      <Link to="/applicant" className="back-link">← Back to Reviewers</Link>

      <div className="rdl-header">
        <Avatar url={reviewer.avatar_url} name={reviewer.full_name} size={160} />
        <div className="rdl-header-info">
          <h1 className="rdl-name">{reviewer.full_name || "Reviewer"}</h1>
          {school && <p className="rdl-school">{school}</p>}
          <div className="rdl-meta-row">
            {avg != null && (
              <span className="rdl-rating-inline">
                <StarRow value={avg} />
                {avg.toFixed(1)}
                <span className="rdl-rating-count">({ratings.length})</span>
              </span>
            )}
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
            <p className="notice">Essay submitted! {reviewer.full_name || "Your reviewer"} will start reviewing it.</p>
          ) : !reviewer.stripe_onboarded ? (
            <p className="rdl-not-accepting">Not accepting submissions yet</p>
          ) : (
            <button
              type="button"
              className="rdl-request-btn"
              onClick={() => navigate(`/reviewers/${id}/request`)}
            >
              Submit Your Essay
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

      {ratings.length > 0 && (
        <>
          <div className="rdl-divider" />

          <div className="rdl-ratings-section">
            <h2 className="rdl-section-label">Ratings</h2>

            <div className="rr-summary">
              <span className="rr-avg">{avg.toFixed(1)}</span>
              <div className="rr-summary-side">
                <StarRow value={avg} size={18} />
                <span className="rr-count">
                  {ratings.length} rating{ratings.length === 1 ? "" : "s"} from past applicants
                </span>
              </div>
            </div>

            <ul className="rr-list">
              {ratings.map((r) => (
                <li key={r.id} className="rr-card">
                  <StarRow value={r.stars} size={15} />
                  {r.comment && <p className="rr-card-comment">{r.comment}</p>}
                  <p className="rr-card-foot">
                    {r.applicant_name || "An applicant"}
                    {" · "}
                    {new Date(r.created_at).toLocaleDateString("en-US", {
                      month: "short", year: "numeric",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
