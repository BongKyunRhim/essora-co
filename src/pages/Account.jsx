import { useState } from "react";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import AvatarUpload from "../components/AvatarUpload.jsx";

// What an APPLICANT sees under "My account": edit their personal info.
export default function Account() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    age: profile?.age ?? "",
    high_school: profile?.high_school ?? "",
    grad_year: profile?.grad_year ?? "",
  });
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [status, setStatus] = useState("");

  if (!profile) return <p className="page">Loading…</p>;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setStatus("Saving…");
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        age: form.age === "" ? null : Number(form.age),
        high_school: form.high_school,
        grad_year: form.grad_year === "" ? null : Number(form.grad_year),
      })
      .eq("id", profile.id);

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }
    await refreshProfile();
    setStatus("Saved.");
  }

  // Photo is saved on its own as soon as it's uploaded.
  async function handleAvatar(url) {
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    await refreshProfile();
  }

  return (
    <section className="page">
      <h1>My account</h1>

      <AvatarUpload
        userId={profile.id}
        url={avatarUrl}
        name={form.full_name}
        onUploaded={handleAvatar}
      />

      <form className="form" onSubmit={handleSave}>
        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Age</span>
          <input
            type="number"
            name="age"
            min="0"
            value={form.age}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>High school (optional)</span>
          <input
            type="text"
            name="high_school"
            value={form.high_school}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Expected graduation year (optional)</span>
          <input
            type="number"
            name="grad_year"
            min="2020"
            value={form.grad_year}
            onChange={handleChange}
          />
        </label>

        <button type="submit">Save</button>
      </form>

      {status && <p className="notice">{status}</p>}
    </section>
  );
}
