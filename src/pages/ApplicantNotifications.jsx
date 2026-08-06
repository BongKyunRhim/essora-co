import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

const STATUS_LABEL = {
  pending: "In review",
  accepted: "In review",
  declined: "Declined",
  completed: "Feedback ready",
  expired: "Expired — refunded",
};

const DISMISSIBLE = new Set(["completed", "declined", "expired"]);

function getItemMod(status, isNew) {
  if (status === "declined" || status === "expired") return "declined";
  if (status === "completed") return isNew ? "new" : "done";
  return "review";
}

function getBadgeMod(status) {
  if (status === "declined" || status === "expired") return "declined";
  if (status === "completed") return "done";
  return "review";
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
      .neq("payment_status", "unpaid")
      .order("created_at", { ascending: false });

    const ids = [...new Set((reqs ?? []).map((r) => r.reviewer_id))];
    const byId = {};
    if (ids.length) {
      const { data: revs } = await supabase.from("profiles").select("*").in("id", ids);
      (revs ?? []).forEach((p) => { byId[p.id] = p; });
    }

    setItems((reqs ?? []).map((r) => ({ ...r, reviewer: byId[r.reviewer_id] })));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  async function dismiss(id) {
    setItems((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("requests").update({ applicant_dismissed: true }).eq("id", id);
  }

  if (loading) return <p className="page">Loading…</p>;

  const activeCount = items.filter((r) => r.status === "pending" || r.status === "accepted").length;

  return (
    <section className="notif-page">
      <header className="notif-header">
        <h1 className="notif-title">Notifications</h1>
        {activeCount > 0 && (
          <span className="notif-count">{activeCount} in review</span>
        )}
      </header>

      {items.length === 0 ? (
        <div className="notif-empty">
          <p>
            No submissions yet.{" "}
            <Link to="/applicant">Find a reviewer</Link> to get started.
          </p>
        </div>
      ) : (
        <ul className="notif-list">
          {items.map((r) => {
            const done = r.status === "completed";
            const isNew = done && !r.applicant_seen;
            const mod = getItemMod(r.status, isNew);
            const badge = getBadgeMod(r.status);
            const dismissible = DISMISSIBLE.has(r.status);
            const href = done ? `/feedback/${r.id}` : `/submissions/${r.id}`;
            return (
              <li
                key={r.id}
                className={`notif-item notif-item--${mod}${dismissible ? " notif-item--dismissible" : ""}`}
              >
                <Link to={href} className="notif-link">
                  <Avatar url={r.reviewer?.avatar_url} name={r.reviewer?.full_name} size={44} />
                  <div className="notif-body">
                    <p className="notif-name">
                      {r.reviewer?.full_name || "Your reviewer"}
                      {isNew && <span className="notif-dot" aria-hidden="true" />}
                    </p>
                    {r.essay_type && (
                      <p className="notif-sub">{r.essay_type.replace(/_/g, " ")}</p>
                    )}
                    <p className="notif-date">{relativeTime(r.created_at)}</p>
                  </div>
                  <span className={`notif-badge notif-badge--${badge}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </Link>
                {dismissible && (
                  <button
                    type="button"
                    className="notif-dismiss"
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
      )}
    </section>
  );
}
