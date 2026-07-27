import { useState } from "react";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import AvatarUpload from "../components/AvatarUpload.jsx";

const SECTIONS = ["Public Profile", "My Activity", "Account & Privacy"];

export default function ReviewerHome() {
  const { profile, refreshProfile } = useAuth();
  const [activeSection, setActiveSection] = useState("Public Profile");
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    age: profile?.age ?? "",
    college: profile?.college ?? "",
    major: profile?.major ?? "",
    grad_year: profile?.grad_year ?? "",
    high_school: profile?.high_school ?? "",
    bio: profile?.bio ?? "",
    long_bio: profile?.long_bio ?? "",
    price: profile?.price ?? "",
    essay_types: profile?.essay_types ?? "",
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
        grad_year: form.grad_year === "" ? null : Number(form.grad_year),
        high_school: form.high_school,
        bio: form.bio,
        long_bio: form.long_bio,
        price: form.price === "" ? null : Number(form.price),
        essay_types: form.essay_types,
        is_listed: form.is_listed,
      })
      .eq("id", profile.id);

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }
    await refreshProfile();
    setStatus("Saved.");
  }

  async function handleAvatar(url) {
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    await refreshProfile();
  }

  return (
    <div className="settings-layout">
      {/* Sidebar */}
      <aside className="settings-sidebar">
        <h2 className="settings-sidebar-title">Profile Settings</h2>
        <nav className="settings-nav">
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`settings-nav-item${activeSection === s ? " active" : ""}`}
              onClick={() => setActiveSection(s)}
            >
              {s}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="settings-main">
        {activeSection === "Public Profile" && (
          <>
            <h2 className="settings-section-title">Public Profile</h2>

            <AvatarUpload
              userId={profile.id}
              url={avatarUrl}
              name={form.full_name}
              onUploaded={handleAvatar}
            />

            <form className="form settings-form" onSubmit={handleSave}>
              {/* Row 1: name */}
              <div className="settings-grid">
                <label className="field">
                  <span>Full name</span>
                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="First & last name"
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
                    placeholder="e.g. 19"
                  />
                </label>
              </div>

              {/* Row 2: college + major */}
              <div className="settings-grid">
                <label className="field">
                  <span>College / University</span>
                  <input
                    type="text"
                    name="college"
                    value={form.college}
                    onChange={handleChange}
                    placeholder="e.g. Stanford University"
                  />
                </label>

                <label className="field">
                  <span>Major</span>
                  <input
                    type="text"
                    name="major"
                    value={form.major}
                    onChange={handleChange}
                    placeholder="e.g. Computer Science"
                  />
                </label>
              </div>

              {/* Row 3: grad year + high school */}
              <div className="settings-grid">
                <label className="field">
                  <span>Graduation year</span>
                  <input
                    type="number"
                    name="grad_year"
                    min="2020"
                    max="2035"
                    value={form.grad_year}
                    onChange={handleChange}
                    placeholder="e.g. 2028"
                  />
                </label>

                <label className="field">
                  <span>High school (optional)</span>
                  <input
                    type="text"
                    name="high_school"
                    value={form.high_school}
                    onChange={handleChange}
                    placeholder="e.g. Lincoln High School"
                  />
                </label>
              </div>

              {/* Row 4: essay types + price */}
              <div className="settings-grid">
                <label className="field">
                  <span>Essay types you review</span>
                  <input
                    type="text"
                    name="essay_types"
                    value={form.essay_types}
                    onChange={handleChange}
                    placeholder="e.g. Common App, Supplemental, Scholarship"
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
                    placeholder="e.g. 25"
                  />
                </label>
              </div>

              {/* Short bio */}
              <label className="field">
                <span>Short tagline <span className="field-hint-inline">(shown on your card)</span></span>
                <input
                  type="text"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  placeholder="One sentence about yourself as a reviewer"
                />
              </label>

              {/* Detailed bio */}
              <label className="field">
                <span>Detailed bio <span className="field-hint-inline">(shown on your full profile page)</span></span>
                <textarea
                  name="long_bio"
                  rows={5}
                  value={form.long_bio}
                  onChange={handleChange}
                  placeholder="Tell applicants about your admissions experience, writing style, and what makes your feedback valuable…"
                />
              </label>

              {/* Listing toggle */}
              <label className="field checkbox settings-listing">
                <input
                  type="checkbox"
                  name="is_listed"
                  checked={form.is_listed}
                  onChange={handleChange}
                />
                <span>Show my profile to applicants</span>
              </label>

              <div className="settings-footer">
                <button type="submit">Save profile</button>
                {status && <p className={`notice${status.startsWith("Error") ? " error" : ""}`}>{status}</p>}
              </div>
            </form>
          </>
        )}

        {activeSection === "My Activity" && (
          <>
            <h2 className="settings-section-title">My Activity</h2>
            <p className="muted">Your review history and completed requests will appear here.</p>
          </>
        )}

        {activeSection === "Account & Privacy" && (
          <>
            <h2 className="settings-section-title">Account & Privacy</h2>
            <p className="muted">Account settings and privacy controls coming soon.</p>
          </>
        )}
      </main>
    </div>
  );
}
