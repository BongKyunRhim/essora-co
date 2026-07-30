import { useState, useEffect } from "react";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";
import AvatarCropper from "../components/AvatarCropper.jsx";

const SECTIONS = ["Profile Settings", "Past Feedback", "Account & Privacy"];

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function Account() {
  const { user, profile, refreshProfile, signOut, isRecovery, clearRecovery } = useAuth();
  const [activeSection, setActiveSection] = useState("Profile Settings");
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    age: profile?.age ?? "",
    bio: profile?.bio ?? "",
    intended_major: profile?.intended_major ?? "",
    dream_schools: profile?.dream_schools ?? "",
  });
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [cropFile, setCropFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [status, setStatus] = useState("");

  // Password change
  const [pwForm, setPwForm] = useState({ current: "", password: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState("");
  const [pwShow, setPwShow] = useState({ current: false, password: false, confirm: false });
  const [forgotStatus, setForgotStatus] = useState("");

  // Delete account
  const [deleteStep, setDeleteStep] = useState(0); // 0 idle, 1 confirm
  const [deleteStatus, setDeleteStatus] = useState("");

  useEffect(() => {
    if (isRecovery) setActiveSection("Account & Privacy");
  }, [isRecovery]);

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
        bio: form.bio,
        intended_major: form.intended_major,
        dream_schools: form.dream_schools,
      })
      .eq("id", profile.id);

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }
    await refreshProfile();
    setStatus("Saved.");
  }

  function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setPhotoError("");
    setCropFile(file);
  }

  async function handleCrop(blob) {
    setCropFile(null);
    setUploading(true);
    setPhotoError("");
    const path = `${profile.id}/avatar.jpg`;
    const { error: err } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (err) {
      setPhotoError("Upload error: " + err.message);
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

  async function handlePasswordUpdate(event) {
    event.preventDefault();
    if (pwForm.password.length < 8) { setPwStatus("Error: Password must be at least 8 characters."); return; }
    if (pwForm.password !== pwForm.confirm) { setPwStatus("Error: Passwords don't match."); return; }
    if (!isRecovery) {
      if (!pwForm.current) { setPwStatus("Error: Please enter your current password."); return; }
      setPwStatus("Verifying…");
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwForm.current,
      });
      if (signInError) { setPwStatus("Error: Current password is incorrect."); return; }
    }
    setPwStatus("Updating…");
    const { error } = await supabase.auth.updateUser({ password: pwForm.password });
    if (error) { setPwStatus("Error: " + error.message); return; }
    setPwForm({ current: "", password: "", confirm: "" });
    setPwStatus("Password updated.");
    if (isRecovery) clearRecovery();
  }

  async function handleForgotPassword() {
    setForgotStatus("Sending…");
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/account`,
    });
    if (error) { setForgotStatus("Error: " + error.message); return; }
    setForgotStatus("Reset email sent — check your inbox.");
  }

  async function handleDeleteAccount() {
    setDeleteStatus("Deleting…");
    const { error } = await supabase.rpc("delete_user");
    if (error) {
      setDeleteStatus("Error: " + error.message);
      return;
    }
    await supabase.auth.signOut();
  }

  async function handleDeletePhoto() {
    setAvatarUrl("");
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    await refreshProfile();
  }

  return (
    <>
    {cropFile && (
      <AvatarCropper
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onCrop={handleCrop}
      />
    )}
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
        {activeSection === "Profile Settings" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">Profile Settings</h2>
              <p className="settings-section-desc">This is what reviewers see before reviewing your essay.</p>
            </div>

            <form className="form settings-form" onSubmit={handleSave}>
              <div className="settings-profile-cols">
                {/* Left column: avatar */}
                <div className="settings-avatar-col">
                  <Avatar url={avatarUrl} name={form.full_name} size={220} />
                  <p className="settings-photo-hint">PNG, JPEG, WebP, GIF · under 50 MB</p>
                  {photoError && <p className="error" style={{ fontSize: "0.8rem" }}>{photoError}</p>}
                  <div className="settings-avatar-actions">
                    <label className="avatar-upload-btn" aria-disabled={uploading}>
                      {uploading ? "Uploading…" : "Upload photo"}
                      <input type="file" accept="image/*" onChange={handleUpload} hidden disabled={uploading} />
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

                {/* Right column: form fields */}
                <div className="settings-fields-col">
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

                  <label className="field">
                    <span>Intended major <span className="field-hint-inline">(optional)</span></span>
                    <input
                      type="text"
                      name="intended_major"
                      value={form.intended_major}
                      onChange={handleChange}
                      placeholder="e.g. Computer Science, Engineering, Undecided"
                    />
                  </label>

                  <label className="field">
                    <span>College list <span className="field-hint-inline">(optional)</span></span>
                    <textarea
                      name="dream_schools"
                      rows={3}
                      value={form.dream_schools}
                      onChange={handleChange}
                      placeholder="e.g. MIT, Stanford, UMich, UCLA…"
                    />
                  </label>
                </div>
              </div>

              <div className="settings-footer">
                <button type="submit">Save profile</button>
                {status && (
                  <p className={`notice${status.startsWith("Error") ? " error" : ""}`}>{status}</p>
                )}
              </div>
            </form>
          </>
        )}

        {activeSection === "Past Feedback" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">Past Feedback</h2>
              <p className="settings-section-desc">Reviews you've received on your essays.</p>
            </div>
            <p className="muted">Your feedback history will appear here once a reviewer responds to your request.</p>
          </>
        )}

        {activeSection === "Account & Privacy" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">Account & Privacy</h2>
              <p className="settings-section-desc">Manage your login credentials and account preferences.</p>
            </div>

            {/* Email */}
            <div className="settings-block">
              <h3 className="settings-block-title">Email address</h3>
              <p className="settings-block-desc">Your sign-in email. Contact support to update it.</p>
              <div className="settings-email-row">
                <span className="settings-email-value">{user?.email}</span>
              </div>
            </div>

            {/* Change password */}
            <div className="settings-block">
              <h3 className="settings-block-title">Change password</h3>
              {isRecovery ? (
                <p className="settings-recovery-banner">You followed a password reset link — set your new password below.</p>
              ) : (
                <p className="settings-block-desc">Choose a strong password you don't use anywhere else.</p>
              )}
              <form className="settings-pw-form" onSubmit={handlePasswordUpdate}>
                {!isRecovery && (
                  <label className="field">
                    <span>Current password</span>
                    <div className="pw-input-wrap">
                      <input
                        type={pwShow.current ? "text" : "password"}
                        value={pwForm.current}
                        onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                        placeholder="Your existing password"
                        autoComplete="current-password"
                      />
                      <button type="button" className="pw-eye-btn" onClick={() => setPwShow((s) => ({ ...s, current: !s.current }))} aria-label={pwShow.current ? "Hide password" : "Show password"}>
                        <EyeIcon open={pwShow.current} />
                      </button>
                    </div>
                  </label>
                )}
                <div className="settings-grid">
                  <label className="field">
                    <span>New password</span>
                    <div className="pw-input-wrap">
                      <input
                        type={pwShow.password ? "text" : "password"}
                        value={pwForm.password}
                        onChange={(e) => setPwForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                      />
                      <button type="button" className="pw-eye-btn" onClick={() => setPwShow((s) => ({ ...s, password: !s.password }))} aria-label={pwShow.password ? "Hide password" : "Show password"}>
                        <EyeIcon open={pwShow.password} />
                      </button>
                    </div>
                  </label>
                  <label className="field">
                    <span>Confirm new password</span>
                    <div className="pw-input-wrap">
                      <input
                        type={pwShow.confirm ? "text" : "password"}
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                      />
                      <button type="button" className="pw-eye-btn" onClick={() => setPwShow((s) => ({ ...s, confirm: !s.confirm }))} aria-label={pwShow.confirm ? "Hide password" : "Show password"}>
                        <EyeIcon open={pwShow.confirm} />
                      </button>
                    </div>
                  </label>
                </div>
                <div className="settings-pw-actions">
                  <div className="settings-pw-row">
                    <button type="submit">Update password</button>
                    {pwStatus && <p className={`notice${pwStatus.startsWith("Error") ? " error" : ""}`}>{pwStatus}</p>}
                  </div>
                  <div className="settings-pw-forgot">
                    <button type="button" className="link-btn" onClick={handleForgotPassword}>
                      Forgot your password?
                    </button>
                    {forgotStatus && <p className={`notice${forgotStatus.startsWith("Error") ? " error" : ""}`}>{forgotStatus}</p>}
                  </div>
                </div>
              </form>
            </div>

            {/* Danger zone */}
            <div className="settings-block settings-block--danger">
              <h3 className="settings-block-title">Delete account</h3>
              <p className="settings-block-desc">Permanently removes your account and all associated data. This cannot be undone.</p>
              {deleteStep === 0 ? (
                <button type="button" className="btn-danger" onClick={() => setDeleteStep(1)}>Delete my account</button>
              ) : (
                <div className="settings-delete-confirm">
                  <p className="settings-delete-warning">Are you sure? This will permanently erase your profile and cannot be recovered.</p>
                  <div className="settings-delete-actions">
                    <button type="button" className="btn-danger" onClick={handleDeleteAccount}>
                      {deleteStatus === "Deleting…" ? "Deleting…" : "Yes, delete my account"}
                    </button>
                    <button type="button" className="cropper-cancel-btn" onClick={() => setDeleteStep(0)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
    </>
  );
}
