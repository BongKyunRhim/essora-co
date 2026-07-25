import { NavLink } from "react-router-dom";

// Shared bordered card for the login / sign-up pages, with tabs at the top
// that switch between the two. The active tab is highlighted automatically.
export default function AuthCard({ children }) {
  const tabClass = ({ isActive }) => `auth-tab ${isActive ? "active" : ""}`;

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <NavLink to="/login" className={tabClass}>
          Log in
        </NavLink>
        <NavLink to="/signup" className={tabClass}>
          Sign up
        </NavLink>
      </div>
      <div className="auth-body">{children}</div>
    </div>
  );
}
