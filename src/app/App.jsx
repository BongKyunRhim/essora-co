import { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useAuth } from "./AuthContext.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
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

function Home() {
  return <Landing />;
}

// App is the shell that holds the whole site together.
export default function App() {
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="app">
      <header className={`app-header${isLanding ? " landing-nav" : ""}${isLanding && scrolled ? " scrolled" : ""}`}>
        <Link to="/" className="brand" onClick={closeMenu}>
          <BrandLogo />
          ESSORA
        </Link>

        {/* Hamburger toggle — only shown on small screens via CSS */}
        <button
          type="button"
          className={`nav-toggle ${menuOpen ? "open" : ""}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`app-nav ${menuOpen ? "open" : ""}`}>
          {user ? (
            <>
              {profile?.role === "applicant" && (
                <>
                  <Link to="/applicant" onClick={closeMenu}>
                    Find reviewers
                  </Link>
                  <Link to="/account" onClick={closeMenu}>
                    My account
                  </Link>
                </>
              )}
              {profile?.role === "reviewer" && (
                <>
                  <Link to="/reviewer" onClick={closeMenu}>
                    My profile
                  </Link>
                  <Link to="/notifications" onClick={closeMenu}>
                    Notifications
                  </Link>
                </>
              )}
              <button
                type="button"
                className="linklike"
                onClick={() => {
                  closeMenu();
                  signOut();
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>
                Log in
              </Link>
              <Link to="/signup" onClick={closeMenu}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Tap outside the open mobile menu to close it */}
      {menuOpen && <div className="nav-overlay" onClick={closeMenu} />}

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
