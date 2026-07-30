import { useState, useEffect } from "react";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";
import AvatarCropper from "../components/AvatarCropper.jsx";

const SECTIONS = ["Public Profile", "My Activity", "Account & Privacy"];

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

export default function ReviewerHome() {
  const { user, profile, refreshProfile, signOut, isRecovery, clearRecovery, isEmailChanged, clearEmailChanged } = useAuth();
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
    is_listed: profile?.is_listed ?? true,
  });
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [cropFile, setCropFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [status, setStatus] = useState("");

  // Email change
  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [emailStatus, setEmailStatus] = useState("");

  // Password change
  const [pwForm, setPwForm] = useState({ current: "", password: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState("");
  const [pwShow, setPwShow] = useState({ current: false, password: false, confirm: false });
  const [forgotStatus, setForgotStatus] = useState("");

  // Delete account
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState("");

  useEffect(() => {
    if (isRecovery) setActiveSection("Account & Privacy");
  }, [isRecovery]);

  useEffect(() => {
    if (isEmailChanged) setActiveSection("Account & Privacy");
  }, [isEmailChanged]);

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
        long_bio: form.long_bio,
        price: form.price === "" ? null : Number(form.price),
        is_listed: form.is_listed,
      })
      .eq("id", profile.id);

    if (error) { setStatus("Error: " + error.message); return; }
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

  async function handleDeletePhoto() {
    setAvatarUrl("");
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    await refreshProfile();
  }

  async function handleEmailUpdate(event) {
    event.preventDefault();
    if (!emailForm.newEmail) { setEmailStatus("Error: Please enter a new email address."); return; }
    if (emailForm.newEmail === user.email) { setEmailStatus("Error: That's already your current email."); return; }
    if (!emailForm.currentPassword) { setEmailStatus("Error: Please enter your current password to confirm."); return; }

    setEmailStatus("Verifying…");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: emailForm.currentPassword,
    });
    if (signInError) { setEmailStatus("Error: Current password is incorrect."); return; }

    setEmailStatus("Updating…");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/change-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ newEmail: emailForm.newEmail }),
    });
    const result = await res.json();
    if (!res.ok) { setEmailStatus("Error: " + result.error); return; }

    await supabase.auth.refreshSession();
    setEmailForm({ newEmail: "", currentPassword: "" });
    setEmailStatus("Email updated successfully.");
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
      redirectTo: `${window.location.origin}/reviewer`,
    });
    if (error) { setForgotStatus("Error: " + error.message); return; }
    setForgotStatus("Reset email sent — check your inbox.");
  }

  async function handleDeleteAccount() {
    setDeleteStatus("Deleting…");
    const { error } = await supabase.rpc("delete_user");
    if (error) { setDeleteStatus("Error: " + error.message); return; }
    await supabase.auth.signOut();
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
        {activeSection === "Public Profile" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">Public Profile</h2>
              <p className="settings-section-desc">This is how applicants will see you on Essora.</p>
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
                      <input type="text" name="full_name" value={form.full_name} onChange={handleChange} placeholder="First & last name" />
                    </label>
                    <label className="field">
                      <span>Age</span>
                      <input type="number" name="age" min="0" value={form.age} onChange={handleChange} placeholder="e.g. 19" />
                    </label>
                  </div>

                  <div className="settings-grid">
                    <label className="field">
                      <span>College / University</span>
                      <input type="text" name="college" value={form.college} onChange={handleChange} placeholder="e.g. Stanford University" />
                    </label>
                    <label className="field">
                      <span>Major</span>
                      <input type="text" name="major" value={form.major} onChange={handleChange} placeholder="e.g. Computer Science" />
                    </label>
                  </div>

                  <div className="settings-grid">
                    <label className="field">
                      <span>Graduation year</span>
                      <input type="number" name="grad_year" min="2020" max="2035" value={form.grad_year} onChange={handleChange} placeholder="e.g. 2028" />
                    </label>
                    <label className="field">
                      <span>Price per essay (USD)</span>
                      <input type="number" name="price" min="0" value={form.price} onChange={handleChange} placeholder="e.g. 25" />
                    </label>
                  </div>

                  <label className="field">
                    <span>Detailed bio <span className="field-hint-inline">(shown on your full profile page)</span></span>
                    <textarea name="long_bio" rows={5} value={form.long_bio} onChange={handleChange} placeholder="Tell applicants about your admissions experience, writing style, and what makes your feedback valuable…" />
                  </label>

                  <label className="field checkbox settings-listing">
                    <input type="checkbox" name="is_listed" checked={form.is_listed} onChange={handleChange} />
                    <span>Show my profile to applicants</span>
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

        {activeSection === "My Activity" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">My Activity</h2>
              <p className="settings-section-desc">Your review history and completed requests.</p>
            </div>
            <p className="muted">No activity yet. Once you accept review requests they'll appear here.</p>
          </>
        )}

        {activeSection === "Account & Privacy" && (
          <>
            <div className="settings-section-header">
              <h2 className="settings-section-title">Account & Privacy</h2>
              <p className="settings-section-desc">Manage your login credentials and account preferences.</p>
            </div>

            {isEmailChanged && (
              <div className="settings-success-banner">
                <span>Email updated successfully.</span>
                <button type="button" className="settings-success-dismiss" onClick={clearEmailChanged}>✕</button>
              </div>
            )}

            {/* Email */}
            <div className="settings-block">
              <h3 className="settings-block-title">Email address</h3>
              <p className="settings-block-desc">Current: <strong>{user?.email}</strong></p>
              <form className="settings-email-form" onSubmit={handleEmailUpdate}>
                <div className="settings-grid">
                  <label className="field">
                    <span>New email address</span>
                    <input
                      type="email"
                      value={emailForm.newEmail}
                      onChange={(e) => { setEmailForm((f) => ({ ...f, newEmail: e.target.value })); setEmailStatus(""); }}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className="field">
                    <span>Current password <span className="field-hint-inline">(to confirm)</span></span>
                    <input
                      type="password"
                      value={emailForm.currentPassword}
                      onChange={(e) => { setEmailForm((f) => ({ ...f, currentPassword: e.target.value })); setEmailStatus(""); }}
                      placeholder="Your current password"
                      autoComplete="current-password"
                    />
                  </label>
                </div>
                <div className="settings-pw-row">
                  <button type="submit">Update email</button>
                  {emailStatus && (
                    <p className={`notice${emailStatus.startsWith("Error") ? " error" : ""}`}>{emailStatus}</p>
                  )}
                </div>
              </form>
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
                      <button type="button" className="pw-eye-btn" onClick={() => setPwShow((s) => ({ ...s, current: !s.current }))} aria-label={pwShow.current ? "Hide" : "Show"}>
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
                      <button type="button" className="pw-eye-btn" onClick={() => setPwShow((s) => ({ ...s, password: !s.password }))} aria-label={pwShow.password ? "Hide" : "Show"}>
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
                      <button type="button" className="pw-eye-btn" onClick={() => setPwShow((s) => ({ ...s, confirm: !s.confirm }))} aria-label={pwShow.confirm ? "Hide" : "Show"}>
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
