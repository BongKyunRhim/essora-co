import { useState } from "react";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import AvatarUpload from "../components/AvatarUpload.jsx";

const SECTIONS = ["My Profile", "Account & Privacy"];

export default function Account() {
  const { profile, refreshProfile } = useAuth();
  const [activeSection, setActiveSection] = useState("My Profile");
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

  async function handleAvatar(url) {
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    await refreshProfile();
  }

  async function handleRemoveAvatar() {
    setAvatarUrl("");
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    await refreshProfile();
  }

  return (
    <div className="settings-layout">
      {/* Sidebar */}
      <aside className="settings-sidebar">
        <p className="settings-sidebar-title">Account Settings</p>
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
        {activeSection === "My Profile" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">My Profile</h2>
              <p className="settings-section-desc">Your personal info shown to reviewers.</p>
            </div>

            <div className="settings-avatar-row">
              <AvatarUpload
                userId={profile.id}
                url={avatarUrl}
                name={form.full_name}
                onUploaded={handleAvatar}
              />
              {avatarUrl && (
                <button type="button" className="settings-remove-photo" onClick={handleRemoveAvatar}>
                  Remove photo
                </button>
              )}
            </div>

            <form className="form settings-form" onSubmit={handleSave}>
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
                    placeholder="e.g. 17"
                  />
                </label>
              </div>

              <div className="settings-grid">
                <label className="field">
                  <span>High school <span className="field-hint-inline">(optional)</span></span>
                  <input
                    type="text"
                    name="high_school"
                    value={form.high_school}
                    onChange={handleChange}
                    placeholder="e.g. Lincoln High School"
                  />
                </label>
                <label className="field">
                  <span>Expected graduation year <span className="field-hint-inline">(optional)</span></span>
                  <input
                    type="number"
                    name="grad_year"
                    min="2020"
                    max="2035"
                    value={form.grad_year}
                    onChange={handleChange}
                    placeholder="e.g. 2026"
                  />
                </label>
              </div>

              <div className="settings-footer">
                <button type="submit">Save profile</button>
                {status && (
                  <p className={`notice${status.startsWith("Error") ? " error" : ""}`}>
                    {status}
                  </p>
                )}
              </div>
            </form>
          </>
        )}

        {activeSection === "Account & Privacy" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">Account & Privacy</h2>
              <p className="settings-section-desc">Manage your account and privacy preferences.</p>
            </div>
            <p className="muted">Account settings coming soon.</p>
          </>
        )}
      </main>
    </div>
  );
}
