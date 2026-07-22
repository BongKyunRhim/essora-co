import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

// What a REVIEWER sees under "Notifications": applicants who requested a
// review, with the option to accept or decline.
export default function ReviewerNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Requests addressed to this reviewer, newest first.
    const { data: reqs } = await supabase
      .from("requests")
      .select("*")
      .eq("reviewer_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch the applicant profile for each request.
    const ids = [...new Set((reqs ?? []).map((r) => r.applicant_id))];
    const byId = {};
    if (ids.length) {
      const { data: apps } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids);
      (apps ?? []).forEach((a) => {
        byId[a.id] = a;
      });
    }

    setItems((reqs ?? []).map((r) => ({ ...r, applicant: byId[r.applicant_id] })));
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id, status) {
    await supabase.from("requests").update({ status }).eq("id", id);
    load();
  }

  if (loading) return <p className="page">Loading…</p>;

  return (
    <section className="page page-wide">
      <h1>Review requests</h1>

      {items.length === 0 && <p>No requests yet.</p>}

      <ul className="request-list">
        {items.map((r) => (
          <li className="request" key={r.id}>
            <Avatar
              url={r.applicant?.avatar_url}
              name={r.applicant?.full_name}
              size={48}
            />
            <div className="request-body">
              <strong>{r.applicant?.full_name || "An applicant"}</strong>
              {r.applicant?.age != null && (
                <span className="muted"> · Age {r.applicant.age}</span>
              )}
              {r.applicant?.high_school && (
                <div className="muted">{r.applicant.high_school}</div>
              )}
              <div className="muted">Status: {r.status}</div>
            </div>

            {r.status === "pending" && (
              <div className="request-actions">
                <button type="button" onClick={() => updateStatus(r.id, "accepted")}>
                  Accept
                </button>
                <button
                  type="button"
                  className="linklike"
                  onClick={() => updateStatus(r.id, "declined")}
                >
                  Decline
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
