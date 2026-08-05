import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

const STATUS_LABEL = {
  pending: "To review",
  accepted: "To review",
  declined: "Declined",
  completed: "Completed",
};

const DISMISSIBLE = new Set(["completed", "declined"]);

function getItemMod(status) {
  if (status === "completed") return "done";
  if (status === "declined") return "declined";
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

export default function ReviewerNotifications() {
  const { user } = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: reqs } = await supabase
      .from("requests")
      .select("*")
      .eq("reviewer_id", user.id)
      .eq("reviewer_dismissed", false)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false });

    const ids = [...new Set((reqs ?? []).map((r) => r.applicant_id))];
    const byId = {};
    if (ids.length) {
      const { data: apps } = await supabase.from("profiles").select("*").in("id", ids);
      (apps ?? []).forEach((a) => { byId[a.id] = a; });
    }

    setItems((reqs ?? []).map((r) => ({ ...r, applicant: byId[r.applicant_id] })));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  async function dismiss(id) {
    setItems((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("requests").update({ reviewer_dismissed: true }).eq("id", id);
  }

  if (loading) return <p className="page">Loading…</p>;

  const activeCount = items.filter((r) => r.status === "pending" || r.status === "accepted").length;

  return (
    <section className="notif-page">
      <header className="notif-header">
        <h1 className="notif-title">Notifications</h1>
        {activeCount > 0 && (
          <span className="notif-count">{activeCount} to review</span>
        )}
      </header>

      {items.length === 0 ? (
        <div className="notif-empty">
          <p>No submissions yet. Check back once applicants request reviews.</p>
        </div>
      ) : (
        <ul className="notif-list">
          {items.map((r) => {
            const mod = getItemMod(r.status);
            const dismissible = DISMISSIBLE.has(r.status);
            return (
              <li
                key={r.id}
                className={`notif-item notif-item--${mod}${dismissible ? " notif-item--dismissible" : ""}`}
              >
                <Link to={`/requests/${r.id}`} className="notif-link">
                  <Avatar url={r.applicant?.avatar_url} name={r.applicant?.full_name} size={44} />
                  <div className="notif-body">
                    <p className="notif-name">{r.applicant?.full_name || "An applicant"}</p>
                    {r.essay_type && (
                      <p className="notif-sub">{r.essay_type.replace(/_/g, " ")}</p>
                    )}
                    <p className="notif-date">{relativeTime(r.created_at)}</p>
                  </div>
                  <span className={`notif-badge notif-badge--${mod}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </Link>
                {dismissible && (
                  <button
                    type="button"
                    className="notif-dismiss"
                    onClick={() => dismiss(r.id)}
                    aria-label="Dismiss notification"
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
