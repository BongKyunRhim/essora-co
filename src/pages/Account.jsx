import { useState } from "react";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";

const SECTIONS = ["My Profile", "Activity", "Account & Privacy"];

export default function Account() {
  const { profile, refreshProfile } = useAuth();
  const [activeSection, setActiveSection] = useState("My Profile");
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    age: profile?.age ?? "",
    high_school: profile?.high_school ?? "",
    grad_year: profile?.grad_year ?? "",
    bio: profile?.bio ?? "",
    intended_major: profile?.intended_major ?? "",
    dream_schools: profile?.dream_schools ?? "",
    gpa: profile?.gpa ?? "",
    sat_score: profile?.sat_score ?? "",
    act_score: profile?.act_score ?? "",
    activities: profile?.activities ?? "",
  });
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
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
        bio: form.bio,
        intended_major: form.intended_major,
        dream_schools: form.dream_schools,
        gpa: form.gpa === "" ? null : Number(form.gpa),
        sat_score: form.sat_score === "" ? null : Number(form.sat_score),
        act_score: form.act_score === "" ? null : Number(form.act_score),
        activities: form.activities,
      })
      .eq("id", profile.id);

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }
    await refreshProfile();
    setStatus("Saved.");
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPhotoError("");
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar.${ext}`;
    const { error: err } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (err) {
      const isBucketMissing = err.message?.toLowerCase().includes("bucket");
      setPhotoError(
        isBucketMissing
          ? "Photo uploads aren't set up yet — ask the site admin to create the storage bucket."
          : "Couldn't upload photo. Please try a different image or try again."
      );
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?updated=${Date.now()}`;
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    await refreshProfile();
    setUploading(false);
  }

  async function handleDeletePhoto() {
    setAvatarUrl("");
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    await refreshProfile();
  }

  return (
    <div className="settings-layout">
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

      <main className="settings-main">
        {activeSection === "My Profile" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">My Profile</h2>
              <p className="settings-section-desc">Your personal info shown to reviewers.</p>
            </div>

            <div className="settings-photo-row">
              <Avatar url={avatarUrl} name={form.full_name} size={68} />
              <div className="settings-photo-info">
                <p className="settings-photo-title">Profile picture</p>
                <p className="settings-photo-hint">PNG, JPEG · under 15 MB</p>
                {photoError && <p className="error" style={{ marginTop: "0.2rem", fontSize: "0.8rem" }}>{photoError}</p>}
              </div>
              <div className="settings-photo-actions">
                <label className="avatar-upload-btn">
                  {uploading ? "Uploading…" : "Upload new picture"}
                  <input type="file" accept="image/*" onChange={handleUpload} hidden />
                </label>
                <button
                  type="button"
                  className="avatar-delete-btn"
                  onClick={handleDeletePhoto}
                  disabled={!avatarUrl}
                >
                  Delete photo
                </button>
              </div>
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
                  <span>Grade</span>
                  <select name="age" value={form.age} onChange={handleChange}>
                    <option value="">Select grade</option>
                    <option value="9">9th grade</option>
                    <option value="10">10th grade</option>
                    <option value="11">11th grade</option>
                    <option value="12">12th grade</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span>About me <span className="field-hint-inline">(shown to reviewers)</span></span>
                <textarea
                  name="bio"
                  rows={3}
                  value={form.bio}
                  onChange={handleChange}
                  placeholder="Tell reviewers a little about yourself — your goals or what kind of feedback you're looking for…"
                />
              </label>

              <div className="settings-footer">
                <button type="submit">Save profile</button>
                {status && (
                  <p className={`notice${status.startsWith("Error") ? " error" : ""}`}>{status}</p>
                )}
              </div>
            </form>
          </>
        )}

        {activeSection === "Activity" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">Activity</h2>
              <p className="settings-section-desc">Academic background and activities that help reviewers give more relevant feedback.</p>
            </div>

            <form className="form settings-form" onSubmit={handleSave}>
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
                  <span>Expected graduation year</span>
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

              <label className="field">
                <span>Intended major / area of interest <span className="field-hint-inline">(optional)</span></span>
                <input
                  type="text"
                  name="intended_major"
                  value={form.intended_major}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science, Undecided, Engineering"
                />
              </label>

              <div className="settings-grid">
                <label className="field">
                  <span>GPA <span className="field-hint-inline">(optional)</span></span>
                  <input
                    type="number"
                    name="gpa"
                    min="0"
                    max="4.0"
                    step="0.01"
                    value={form.gpa}
                    onChange={handleChange}
                    placeholder="e.g. 3.8"
                  />
                </label>
                <label className="field">
                  <span>SAT score <span className="field-hint-inline">(optional)</span></span>
                  <input
                    type="number"
                    name="sat_score"
                    min="400"
                    max="1600"
                    value={form.sat_score}
                    onChange={handleChange}
                    placeholder="e.g. 1450"
                  />
                </label>
              </div>

              <label className="field">
                <span>ACT score <span className="field-hint-inline">(optional)</span></span>
                <input
                  type="number"
                  name="act_score"
                  min="1"
                  max="36"
                  value={form.act_score}
                  onChange={handleChange}
                  placeholder="e.g. 32"
                  style={{ maxWidth: "240px" }}
                />
              </label>

              <label className="field">
                <span>College list <span className="field-hint-inline">(optional)</span></span>
                <textarea
                  name="dream_schools"
                  rows={3}
                  value={form.dream_schools}
                  onChange={handleChange}
                  placeholder="List the colleges you're applying to or interested in — e.g. MIT, Stanford, UMich, UCLA…"
                />
              </label>

              <label className="field">
                <span>Extracurriculars & activities <span className="field-hint-inline">(optional)</span></span>
                <textarea
                  name="activities"
                  rows={3}
                  value={form.activities}
                  onChange={handleChange}
                  placeholder="e.g. Varsity soccer, debate team, robotics club, volunteer work…"
                />
              </label>

              <div className="settings-footer">
                <button type="submit">Save</button>
                {status && (
                  <p className={`notice${status.startsWith("Error") ? " error" : ""}`}>{status}</p>
                )}
              </div>
            </form>
          </>
        )}

        {activeSection === "Account & Privacy" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">Account & Privacy</h2>
              <p className="settings-section-desc">Manage your login and privacy preferences.</p>
            </div>
            <p className="muted">Account settings coming soon.</p>
          </>
        )}
      </main>
    </div>
  );
}
