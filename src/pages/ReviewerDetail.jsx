import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

// The detailed page for a single reviewer, opened from a card.
export default function ReviewerDetail() {
  const { id } = useParams();
  const [reviewer, setReviewer] = useState(null);
  const [loading, setLoading] = useState(true);

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
    </section>
  );
}
