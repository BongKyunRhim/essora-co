import { useState } from "react";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import AvatarUpload from "../components/AvatarUpload.jsx";

// What a REVIEWER sees: edit the profile applicants will browse, and set
// the amount they charge per essay.
export default function ReviewerHome() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    age: profile?.age ?? "",
    college: profile?.college ?? "",
    major: profile?.major ?? "",
    bio: profile?.bio ?? "",
    long_bio: profile?.long_bio ?? "",
    price: profile?.price ?? "",
    is_listed: profile?.is_listed ?? true,
  });
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [status, setStatus] = useState("");

  if (!profile) return <p className="page">Loading…</p>;

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setStatus("Saving…");
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        age: form.age === "" ? null : Number(form.age),
        college: form.college,
        major: form.major,
        bio: form.bio,
        long_bio: form.long_bio,
        price: form.price === "" ? null : Number(form.price),
        is_listed: form.is_listed,
      })
      .eq("id", profile.id);

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }
    await refreshProfile();
    setStatus("Saved. Applicants can now see this.");
  }

  async function handleAvatar(url) {
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    await refreshProfile();
  }

  return (
    <section className="page">
      <h1>Your reviewer profile</h1>

      <AvatarUpload
        userId={profile.id}
        url={avatarUrl}
        name={form.full_name}
        onUploaded={handleAvatar}
      />

      <form className="form" onSubmit={handleSave}>
        <label className="field checkbox">
          <input
            type="checkbox"
            name="is_listed"
            checked={form.is_listed}
            onChange={handleChange}
          />
          <span>Show my profile to applicants</span>
        </label>

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
          <span>College / university</span>
          <input
            type="text"
            name="college"
            value={form.college}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Major</span>
          <input
            type="text"
            name="major"
            value={form.major}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Short tagline (shown on your card)</span>
          <input
            type="text"
            name="bio"
            value={form.bio}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Detailed bio (shown on your full page)</span>
          <textarea
            name="long_bio"
            rows={6}
            value={form.long_bio}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Price per essay (USD)</span>
          <input
            type="number"
            name="price"
            min="0"
            value={form.price}
            onChange={handleChange}
          />
        </label>

        <button type="submit">Save profile</button>
      </form>

      {status && <p className="notice">{status}</p>}
    </section>
  );
}
