import { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useAuth } from "./AuthContext.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import Avatar from "../components/Avatar.jsx";
import SignUp from "../pages/SignUp.jsx";
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import ReviewerHome from "../pages/ReviewerHome.jsx";
import ApplicantHome from "../pages/ApplicantHome.jsx";
import Account from "../pages/Account.jsx";
import ReviewerDetail from "../pages/ReviewerDetail.jsx";
import ReviewerNotifications from "../pages/ReviewerNotifications.jsx";
import Landing from "../pages/Landing.jsx";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="page">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function Home() {
  return <Landing />;
}

export default function App() {
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const closeMenu = () => setMenuOpen(false);
  const closeProfile = () => setProfileOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const profileHref = profile?.role === "reviewer" ? "/reviewer" : "/account";

  return (
    <div className="app">
      <header className={`app-header${isLanding ? " landing-nav" : ""}${isLanding && scrolled ? " scrolled" : ""}`}>
        <Link to="/" className="brand" onClick={closeMenu}>
          <BrandLogo />
          ESSORA
        </Link>

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
              {/* Find reviewers — shown for applicants */}
              {profile?.role === "applicant" && (
                <Link to="/applicant" onClick={closeMenu}>
                  Find reviewers
                </Link>
              )}

              {/* Notification bell — shown for reviewers */}
              {profile?.role === "reviewer" && (
                <Link to="/notifications" className="nav-icon-btn" onClick={closeMenu} aria-label="Notifications">
                  <BellIcon />
                </Link>
              )}

              {/* Profile avatar dropdown */}
              <div className="nav-profile-wrap">
                <button
                  type="button"
                  className="nav-avatar-btn"
                  aria-label="Profile menu"
                  onClick={() => setProfileOpen((o) => !o)}
                >
                  <Avatar url={profile?.avatar_url} name={profile?.full_name} size={34} />
                </button>

                {profileOpen && (
                  <>
                    <div className="nav-profile-dropdown">
                      <p className="nav-profile-name">{profile?.full_name || "My account"}</p>
                      <Link to={profileHref} className="nav-profile-item" onClick={() => { closeMenu(); closeProfile(); }}>
                        Profile settings
                      </Link>
                      <button
                        type="button"
                        className="nav-profile-item nav-profile-signout"
                        onClick={() => { closeMenu(); closeProfile(); signOut(); }}
                      >
                        Log out
                      </button>
                    </div>
                    <div className="nav-profile-overlay" onClick={closeProfile} />
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>Log in</Link>
              <Link to="/signup" onClick={closeMenu}>Sign up</Link>
            </>
          )}
        </nav>
      </header>

      {menuOpen && <div className="nav-overlay" onClick={closeMenu} />}

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/reviewer" element={<ProtectedRoute><ReviewerHome /></ProtectedRoute>} />
          <Route path="/applicant" element={<ProtectedRoute><ApplicantHome /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/reviewers/:id" element={<ProtectedRoute><ReviewerDetail /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><ReviewerNotifications /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <SpeedInsights />
    </div>
  );
}
