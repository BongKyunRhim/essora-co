import { useState } from "react";
import { Link } from "react-router-dom";

// Sign-up page. Backbone only — collects the info an account needs.
export default function SignUp() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "applicant", // "applicant" or "reviewer"
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    // No backend yet — just log the values so the form is wired up.
    console.log("sign up:", form);
  }

  return (
    <section className="page">
      <h1>Sign up</h1>

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

        <button type="submit">Create account</button>
      </form>

      <p className="switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}
