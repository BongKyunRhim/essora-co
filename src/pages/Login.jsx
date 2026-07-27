import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import AuthCard from "../components/AuthCard.jsx";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
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

    const errs = {};
    if (!form.email) errs.email = "Email is required.";
    if (!form.password) errs.password = "Password is required.";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    if (!isSupabaseConfigured) {
      setError("Storage isn't connected yet. Add your Supabase keys in src/lib/config.js.");
      return;
    }

    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setBusy(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate("/dashboard");
  }

  return (
    <AuthCard>
      <p className="auth-intro">Welcome back.</p>

      {error && <p className="error">{error}</p>}

      <form className="form" onSubmit={handleSubmit} noValidate>
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
          {fieldErrors.password && <span className="field-error-msg">{fieldErrors.password}</span>}
        </label>

        <button type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthCard>
  );
}
