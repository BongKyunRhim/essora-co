import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Avatar from "../components/Avatar.jsx";
import AvatarCropper from "../components/AvatarCropper.jsx";

const ESSAY_TYPE_LABELS = {
  personal_statement: "Common App / Personal Statement",
  supplemental:       "Supplemental Essay",
  scholarship:        "Scholarship Essay",
  other:              "Other",
};

const RATING_CATEGORIES = [
  { key: "grammar",      label: "Grammar & Mechanics" },
  { key: "clarity",      label: "Clarity & Flow" },
  { key: "storytelling", label: "Storytelling" },
  { key: "voice",        label: "Voice & Authenticity" },
  { key: "impact",       label: "Overall Impact" },
];

function StarSvg({ filled, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarRow({ value, size = 14 }) {
  const filled = Math.round((value ?? 0) * 2) / 2;
  return (
    <span className="rr-stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, filled - (n - 1)));
        return (
          <span key={n} className="rr-star-wrap" style={{ width: size, height: size }}>
            <span className="rr-star-base"><StarSvg filled={false} size={size} /></span>
            {fill > 0 && (
              <span className="rr-star-fill" style={{ width: `${fill * 100}%` }}>
                <StarSvg filled size={size} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

const SECTIONS = ["Profile Settings", "Past Feedback", "Account & Privacy"];

const SECTION_ICONS = {
  "Profile Settings": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  "Past Feedback": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  "Account & Privacy": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
};

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
  const { user, profile, refreshProfile, signOut, isRecovery, clearRecovery, isEmailChanged, clearEmailChanged } = useAuth();
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

  // Email change
  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [emailStatus, setEmailStatus] = useState("");

  // Password change
  const [pwForm, setPwForm] = useState({ current: "", password: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState("");
  const [pwShow, setPwShow] = useState({ current: false, password: false, confirm: false });
  const [forgotStatus, setForgotStatus] = useState("");

  // Delete account
  const [deleteStep, setDeleteStep] = useState(0); // 0 idle, 1 confirm
  const [deleteStatus, setDeleteStatus] = useState("");

  const [pastFeedback, setPastFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  useEffect(() => {
    if (isRecovery) setActiveSection("Account & Privacy");
  }, [isRecovery]);

  useEffect(() => {
    if (isEmailChanged) setActiveSection("Account & Privacy");
  }, [isEmailChanged]);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      const { data: reqs } = await supabase
        .from("requests")
        .select("*")
        .eq("applicant_id", profile.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (!active || !reqs?.length) { setFeedbackLoading(false); return; }

      const reviewerIds = [...new Set(reqs.map((r) => r.reviewer_id))];
      const requestIds  = reqs.map((r) => r.id);

      const [{ data: reviews }, { data: reviewers }] = await Promise.all([
        supabase.from("reviews").select("*").in("request_id", requestIds).eq("submitted", true),
        supabase.from("profiles").select("id, full_name, avatar_url, college, major").in("id", reviewerIds),
      ]);

      if (!active) return;

      const reviewByReqId  = Object.fromEntries((reviews  ?? []).map((r) => [r.request_id, r]));
      const reviewerById   = Object.fromEntries((reviewers ?? []).map((r) => [r.id, r]));

      setPastFeedback(
        reqs
          .filter((req) => reviewByReqId[req.id])
          .map((req) => ({
            request:  req,
            review:   reviewByReqId[req.id],
            reviewer: reviewerById[req.reviewer_id] ?? null,
          }))
      );
      setFeedbackLoading(false);
    })();
    return () => { active = false; };
  }, [profile?.id]);

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
        <div className="settings-user">
          <Avatar url={avatarUrl} name={form.full_name} size={38} />
          <div className="settings-user-meta">
            <p className="settings-user-name">{form.full_name || "Your account"}</p>
            <p className="settings-user-role">Applicant</p>
          </div>
        </div>
        <nav className="settings-nav">
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`settings-nav-item${activeSection === s ? " active" : ""}`}
              onClick={() => setActiveSection(s)}
            >
              {SECTION_ICONS[s]}
              <span>{s}</span>
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

            {feedbackLoading && <p className="muted">Loading feedback…</p>}

            {!feedbackLoading && pastFeedback.length === 0 && (
              <p className="muted">No completed reviews yet — feedback will appear here once a reviewer submits their review.</p>
            )}

            <div className="pf-list">
              {pastFeedback.map(({ request, review, reviewer }) => {
                const cats = RATING_CATEGORIES.map((c) => review.ratings?.[c.key]).filter(Boolean);
                const avg  = cats.length ? cats.reduce((s, v) => s + v, 0) / cats.length : null;
                const school = [reviewer?.college, reviewer?.major].filter(Boolean).join(" · ");
                return (
                  <div key={request.id} className="pf-card">

                    {/* Reviewer header band */}
                    <div className="pf-card-head">
                      <div className="pf-reviewer-row">
                        <Avatar url={reviewer?.avatar_url} name={reviewer?.full_name} size={36} />
                        <div className="pf-reviewer-info">
                          <span className="pf-reviewer-name">{reviewer?.full_name || "Reviewer"}</span>
                          {school && <span className="pf-reviewer-school">{school}</span>}
                        </div>
                      </div>
                      <div className="pf-head-right">
                        {request.essay_type && (
                          <span className="rdl-age-tag">
                            {ESSAY_TYPE_LABELS[request.essay_type] ?? request.essay_type}
                          </span>
                        )}
                        <span className="pf-date">
                          {new Date(request.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="pf-card-body">

                      {/* Overall score */}
                      {avg != null && (
                        <div className="pf-score-row">
                          <span className="pf-score-num">{avg.toFixed(1)}</span>
                          <StarRow value={avg} size={15} />
                          <span className="pf-score-label">overall</span>
                        </div>
                      )}

                      {/* Per-category progress bars */}
                      <div className="pf-bars">
                        {RATING_CATEGORIES.map((c) => {
                          const val = review.ratings?.[c.key];
                          if (val == null) return null;
                          return (
                            <div key={c.key} className="pf-bar-row">
                              <span className="pf-bar-label">{c.label}</span>
                              <div className="pf-bar-track">
                                <div className="pf-bar-fill" style={{ width: `${(val / 5) * 100}%` }} />
                              </div>
                              <span className="pf-bar-val">{val}/5</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Final comment */}
                      {review.final_comment && (
                        <p className="pf-comment">"{review.final_comment}"</p>
                      )}

                      {/* Footer */}
                      <div className="pf-card-foot">
                        <Link to={`/feedback/${request.id}`} className="pf-view-link">
                          View full feedback →
                        </Link>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
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

            {/* Payment protection policy */}
            <div className="settings-block">
              <h3 className="settings-block-title">Your payment protection</h3>
              <ul className="settings-policy">
                <li>
                  <strong>Secure payments via Stripe.</strong> Your card details
                  are handled entirely by Stripe and never touch ESSORA&apos;s
                  servers.
                </li>
                <li>
                  <strong>3-day delivery guarantee.</strong> Every review must
                  be completed within 3 days of your payment. If it
                  isn&apos;t, the submission expires and your full payment —
                  including the processing fee — is refunded to your card
                  automatically. No need to ask.
                </li>
                <li>
                  <strong>Something else wrong?</strong> If a delivered review
                  doesn&apos;t meet our standards, contact us and we&apos;ll
                  make it right.
                </li>
              </ul>
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
