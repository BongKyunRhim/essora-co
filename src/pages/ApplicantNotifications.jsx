import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

// The applicant's side of the pipeline: waiting on feedback or reading it.
const STATUS_LABEL = { pending: "In review", accepted: "In review", declined: "Declined", completed: "Feedback ready" };
const STATUS_CLASS = { pending: "pending", accepted: "pending", declined: "declined", completed: "accepted" };

// Only past/finished submissions can be removed — never ones still in review.
const DISMISSIBLE = new Set(["completed", "declined"]);

export default function ApplicantNotifications() {
  const { user } = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: reqs } = await supabase
      .from("requests")
      .select("*")
      .eq("applicant_id", user.id)
      .eq("applicant_dismissed", false)
      .order("created_at", { ascending: false });

    const ids = [...new Set((reqs ?? []).map((r) => r.reviewer_id))];
    const byId = {};
    if (ids.length) {
      const { data: revs } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids);
      (revs ?? []).forEach((p) => { byId[p.id] = p; });
    }

    setItems((reqs ?? []).map((r) => ({ ...r, reviewer: byId[r.reviewer_id] })));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  async function dismiss(id) {
    // Optimistic remove so the UI responds instantly.
    setItems((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("requests").update({ applicant_dismissed: true }).eq("id", id);
  }

  if (loading) return <p className="page">Loading…</p>;

  return (
    <section className="reviewer-notifications-page">
      <h1 className="rn-title">Notifications</h1>

      {items.length === 0 && (
        <p className="muted" style={{ marginTop: "2rem" }}>
          You haven't submitted any essays yet.{" "}
          <Link to="/applicant">Find a reviewer</Link> to get started.
        </p>
      )}

      <ul className="rn-list">
        {items.map((r) => {
          const done = r.status === "completed";
          const isNew = done && !r.applicant_seen;
          const dismissible = DISMISSIBLE.has(r.status);
          const href = done ? `/feedback/${r.id}` : `/submissions/${r.id}`;
          const inner = (
            <>
              <Avatar
                url={r.reviewer?.avatar_url}
                name={r.reviewer?.full_name}
                size={48}
              />
              <div className="rn-item-body">
                <p className="rn-item-name">
                  {r.reviewer?.full_name || "Your reviewer"}
                </p>
                {r.essay_type && (
                  <p className="rn-item-sub">{r.essay_type.replace(/_/g, " ")}</p>
                )}
                <p className="rn-item-date">
                  {new Date(r.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>
              </div>
              <span className={`rn-status rn-status--${STATUS_CLASS[r.status] ?? r.status}`}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </>
          );
          return (
            <li key={r.id} className={`rn-list-item${dismissible ? " rn-list-item--dismissible" : ""}`}>
              <Link to={href} className={`rn-item${isNew ? " rn-item--new" : ""}`}>{inner}</Link>
              {dismissible && (
                <button
                  type="button"
                  className="rn-dismiss-btn"
                  onClick={() => dismiss(r.id)}
                  aria-label="Remove notification"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
