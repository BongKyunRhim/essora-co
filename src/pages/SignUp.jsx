import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

// Sign-up page. Creates a real account in Supabase and records the chosen
// role (applicant or reviewer), which decides what the user sees afterward.
export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "applicant",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!isSupabaseConfigured) {
      setError(
        "Storage isn't connected yet. Add your Supabase keys in src/lib/config.js."
      );
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    // The name and role are passed as metadata; a database trigger copies
    // them into the user's profile row.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, role: form.role } },
    });
    setBusy(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      navigate("/dashboard");
    } else {
      setNotice("Account created. Check your email to confirm, then log in.");
    }
  }

  return (
    <section className="page">
      <h1>Sign up</h1>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        <label className="field">
          <span>Confirm password</span>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </label>

        <fieldset className="field">
          <legend>I am a</legend>
          <label className="radio">
            <input
              type="radio"
              name="role"
              value="applicant"
              checked={form.role === "applicant"}
              onChange={handleChange}
            />
            <span>Applicant</span>
          </label>
          <label className="radio">
            <input
              type="radio"
              name="role"
              value="reviewer"
              checked={form.role === "reviewer"}
              onChange={handleChange}
            />
            <span>Reviewer</span>
          </label>
        </fieldset>

        <button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}
