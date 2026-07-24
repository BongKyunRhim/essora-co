import { Routes, Route, Navigate, Link } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useAuth } from "./AuthContext.jsx";
import logo from "../assets/essora_logo1.png";
import SignUp from "../pages/SignUp.jsx";
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import ReviewerHome from "../pages/ReviewerHome.jsx";
import ApplicantHome from "../pages/ApplicantHome.jsx";
import Account from "../pages/Account.jsx";
import ReviewerDetail from "../pages/ReviewerDetail.jsx";
import ReviewerNotifications from "../pages/ReviewerNotifications.jsx";
import Landing from "../pages/Landing.jsx";

// Only lets logged-in users through; otherwise sends them to the login page.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="page">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// The home route: show the public landing page to visitors, and send
// logged-in users straight to their dashboard.
function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
}

// App is the shell that holds the whole site together.
export default function App() {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <img className="brand-logo" src={logo} alt="" />
          ESSORA
        </Link>
        <nav className="app-nav">
          {user ? (
            <>
              {profile?.role === "applicant" && (
                <>
                  <Link to="/applicant">Find reviewers</Link>
                  <Link to="/account">My account</Link>
                </>
              )}
              {profile?.role === "reviewer" && (
                <>
                  <Link to="/reviewer">My profile</Link>
                  <Link to="/notifications">Notifications</Link>
                </>
              )}
              <button type="button" className="linklike" onClick={signOut}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/signup">Sign up</Link>
            </>
          )}
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer"
            element={
              <ProtectedRoute>
                <ReviewerHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant"
            element={
              <ProtectedRoute>
                <ApplicantHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewers/:id"
            element={
              <ProtectedRoute>
                <ReviewerDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <ReviewerNotifications />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {/* Vercel performance analytics (collects data once deployed on Vercel) */}
      <SpeedInsights />
    </div>
  );
}
