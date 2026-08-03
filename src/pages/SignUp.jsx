import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import AuthCard from "../components/AuthCard.jsx";

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    schoolEmail: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const errs = {};
    if (!form.name) errs.name = "Full name is required.";
    if (!form.email) errs.email = "Email is required.";
    if (!form.password) {
      errs.password = "Password is required.";
    } else if (form.password.length < 8) {
      errs.password = "Password must be at least 8 characters.";
    } else if (form.confirmPassword && form.password !== form.confirmPassword) {
      errs.password = " "; // red border only, no message
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = "Please confirm your password.";
    } else if (form.password && form.password !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    if (!form.role) errs.role = "Please select a role.";
    if (form.role === "reviewer" && !form.schoolEmail) {
      errs.schoolEmail = "School email is required for reviewers.";
    }
    if (form.role === "reviewer" && form.schoolEmail && !form.schoolEmail.toLowerCase().endsWith(".edu")) {
      errs.schoolEmail = "Must be a valid .edu address.";
    }
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    if (!isSupabaseConfigured) {
      setError("Storage isn't connected yet. Add your Supabase keys in src/lib/config.js.");
      return;
    }

    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, role: form.role, school_email: form.schoolEmail || null } },
    });
    setBusy(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      navigate(form.role === "reviewer" ? "/reviewer" : "/dashboard");
    } else {
      setNotice("Account created. Check your email to confirm, then log in.");
    }
  }

  return (
    <AuthCard>
      <p className="auth-intro">Create your account.</p>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className={`field${fieldErrors.name ? " field--error" : ""}`}>
          <span>Full name</span>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
          />
          {fieldErrors.name && <span className="field-error-msg">{fieldErrors.name}</span>}
        </label>

        <label className={`field${fieldErrors.email ? " field--error" : ""}`}>
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
          {fieldErrors.email && <span className="field-error-msg">{fieldErrors.email}</span>}
        </label>

        <label className={`field${fieldErrors.password ? " field--error" : ""}`}>
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          {fieldErrors.password && fieldErrors.password.trim() && (
            <span className="field-error-msg">{fieldErrors.password}</span>
          )}
        </label>

        <label className={`field${fieldErrors.confirmPassword ? " field--error" : ""}`}>
          <span>Confirm password</span>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
          />
          {fieldErrors.confirmPassword && <span className="field-error-msg">{fieldErrors.confirmPassword}</span>}
        </label>

        <fieldset className={`field${fieldErrors.role ? " field--error" : ""}`}>
          <legend>I am a</legend>
          <div className="role-picker">
            {["applicant", "reviewer"].map((r) => (
              <button
                key={r}
                type="button"
                className={`role-btn${form.role === r ? " selected" : ""}`}
                onClick={() => {
                  if (form.role !== r) {
                    setForm((prev) => ({ ...prev, role: r }));
                    if (fieldErrors.role) setFieldErrors((prev) => ({ ...prev, role: "" }));
                  }
                }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          {fieldErrors.role && <span className="field-error-msg">{fieldErrors.role}</span>}
        </fieldset>

        {form.role === "reviewer" && (
          <label className={`field${fieldErrors.schoolEmail ? " field--error" : ""}`}>
            <span>School email</span>
            <input
              type="email"
              name="schoolEmail"
              value={form.schoolEmail}
              onChange={handleChange}
              placeholder="you@university.edu"
            />
            <span className="field-hint">Must be a valid .edu address to verify you're a current student.</span>
            {fieldErrors.schoolEmail && <span className="field-error-msg">{fieldErrors.schoolEmail}</span>}
          </label>
        )}

        <button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
