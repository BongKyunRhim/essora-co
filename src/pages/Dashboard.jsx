import { Link, useLocation } from "react-router-dom";

// Dashboard is the hub you land on after logging in.
// The rest of the site branches from here. Backbone only.
export default function Dashboard() {
  const location = useLocation();
  // Role is passed along when arriving from sign up; default to applicant.
  const role = location.state?.role ?? "applicant";

  return (
    <section className="page page-wide">
      <h1>Dashboard</h1>
      <p className="muted">Signed in as {role}.</p>

      <div className="cards">
        <article className="card">
          <h2>Submit an essay</h2>
          <p>Send a draft to a reviewer for feedback.</p>
          <Link to="/submit">Go</Link>
        </article>

        <article className="card">
          <h2>Review essays</h2>
          <p>Pick up an essay waiting for feedback.</p>
          <Link to="/review">Go</Link>
        </article>
      </div>
    </section>
  );
}
