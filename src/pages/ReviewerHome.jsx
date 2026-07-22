import { useState } from "react";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

// What a REVIEWER sees: a form to post their info and set the amount
// they charge. Saved to their own profile row in the database.
export default function ReviewerHome() {
  const { profile, refreshProfile } = useAuth();
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [price, setPrice] = useState(profile?.price ?? "");
  const [status, setStatus] = useState("");

  if (!profile) return <p className="page">Loading…</p>;

  async function handleSave(event) {
    event.preventDefault();
    setStatus("Saving…");
    const { error } = await supabase
      .from("profiles")
      .update({
        bio,
        price: price === "" ? null : Number(price),
      })
      .eq("id", profile.id);

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }
    await refreshProfile();
    setStatus("Saved. Applicants can now see this.");
  }

  return (
    <section className="page">
      <h1>Your reviewer profile</h1>
      <p className="muted">Signed in as {profile.full_name || profile.email}.</p>

      <form className="form" onSubmit={handleSave}>
        <label className="field">
          <span>About you (experience, schools, subjects)</span>
          <textarea
            name="bio"
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Price per essay (USD)</span>
          <input
            type="number"
            name="price"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>

        <button type="submit">Save profile</button>
      </form>

      {status && <p className="notice">{status}</p>}
    </section>
  );
}
