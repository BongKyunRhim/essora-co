import { useEffect, useState } from "react";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

// What an APPLICANT sees: the list of reviewers who have posted a profile.
export default function ApplicantHome() {
  const { profile } = useAuth();
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "reviewer")
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
      {profile && (
        <p className="muted">
          Signed in as {profile.full_name || profile.email}.
        </p>
      )}

      {loading && <p>Loading reviewers…</p>}
      {!loading && reviewers.length === 0 && (
        <p>No reviewers have posted yet. Check back soon.</p>
      )}

      <div className="cards">
        {reviewers.map((r) => (
          <article className="card" key={r.id}>
            <h2>{r.full_name || "Reviewer"}</h2>
            <p>{r.bio || "No description yet."}</p>
            <p className="price">
              {r.price != null ? `$${r.price} per essay` : "Price not set"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
