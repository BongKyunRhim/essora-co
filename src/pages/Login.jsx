import { useState } from "react";
import { Link } from "react-router-dom";

// Login page. Email + password only.
export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    // No backend yet — just log the values so the form is wired up.
    console.log("log in:", form);
  }

  return (
    <section className="page">
      <h1>Log in</h1>

      <form className="form" onSubmit={handleSubmit}>
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

        <button type="submit">Log in</button>
      </form>

      <p className="switch">
        Need an account? <Link to="/signup">Sign up</Link>
      </p>
    </section>
  );
}
