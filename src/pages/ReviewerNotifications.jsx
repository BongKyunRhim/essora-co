import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

const STATUS_LABEL = { pending: "Pending", accepted: "Accepted", declined: "Declined", completed: "Completed" };

export default function ReviewerNotifications() {
  const { user } = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: reqs } = await supabase
      .from("requests")
      .select("*")
      .eq("reviewer_id", user.id)
      .order("created_at", { ascending: false });

    const ids = [...new Set((reqs ?? []).map((r) => r.applicant_id))];
    const byId = {};
    if (ids.length) {
      const { data: apps } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids);
      (apps ?? []).forEach((a) => { byId[a.id] = a; });
    }

    setItems((reqs ?? []).map((r) => ({ ...r, applicant: byId[r.applicant_id] })));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="page">Loading…</p>;

  return (
    <section className="reviewer-notifications-page">
      <h1 className="rn-title">Review Requests</h1>

      {items.length === 0 && (
        <p className="muted" style={{ marginTop: "2rem" }}>No requests yet.</p>
      )}

      <ul className="rn-list">
        {items.map((r) => (
          <li key={r.id}>
            <Link to={`/requests/${r.id}`} className="rn-item">
              <Avatar
                url={r.applicant?.avatar_url}
                name={r.applicant?.full_name}
                size={48}
              />
              <div className="rn-item-body">
                <p className="rn-item-name">
                  {r.applicant?.full_name || "An applicant"}
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
              <span className={`rn-status rn-status--${r.status}`}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
