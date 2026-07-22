import { Navigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";

// Dashboard is just a signpost: it sends each user to the right home page
// based on the role they chose at sign up.
export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading) return <p className="page">Loading…</p>;
  if (!profile) return <p className="page">Setting up your account…</p>;

  return (
    <Navigate
      to={profile.role === "reviewer" ? "/reviewer" : "/applicant"}
      replace
    />
  );
}
