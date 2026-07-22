import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

// What an APPLICANT sees under "Find reviewers": every reviewer as a card.
// Clicking a card opens that reviewer's detailed page.
export default function ApplicantHome() {
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "reviewer")
      .eq("is_listed", true)
      .then(({ data }) => {
        if (!active) return;
        setReviewers(data ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page page-wide">
      <h1>Find a reviewer</h1>

      {loading && <p>Loading reviewers…</p>}
      {!loading && reviewers.length === 0 && (
        <p>No reviewers have posted yet. Check back soon.</p>
      )}

      <div className="cards">
        {reviewers.map((r) => (
          <Link className="card reviewer-card" to={`/reviewers/${r.id}`} key={r.id}>
            <Avatar url={r.avatar_url} name={r.full_name} size={64} />
            <h2>{r.full_name || "Reviewer"}</h2>
            <p className="muted">
              {[r.college, r.major].filter(Boolean).join(" · ") || "—"}
            </p>
            {r.age != null && <p className="muted">Age {r.age}</p>}
            {r.price != null && <p className="price">${r.price} / essay</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
