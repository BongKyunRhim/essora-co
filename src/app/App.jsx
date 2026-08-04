import { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
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
import ApplicantNotifications from "../pages/ApplicantNotifications.jsx";
import ApplicantFeedback from "../pages/ApplicantFeedback.jsx";
import RequestReview from "../pages/RequestReview.jsx";
import RequestDetail from "../pages/RequestDetail.jsx";
import PaymentSuccess from "../pages/PaymentSuccess.jsx";
import SubmissionStatus from "../pages/SubmissionStatus.jsx";
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

// One bell, two inboxes — reviewers see submissions, applicants see feedback.
function NotificationsPage() {
  const { profile } = useAuth();
  if (!profile) return <p className="page">Loading…</p>;
  return profile.role === "reviewer" ? <ReviewerNotifications /> : <ApplicantNotifications />;
}

export default function App() {
  const { user, profile, signOut, isRecovery, isEmailChanged } = useAuth();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/";

  useEffect(() => {
    if (isRecovery) navigate(profile?.role === "reviewer" ? "/reviewer" : "/account", { replace: true });
  }, [isRecovery, navigate, profile?.role]);

  useEffect(() => {
    if (isEmailChanged) navigate(profile?.role === "reviewer" ? "/reviewer" : "/account", { replace: true });
  }, [isEmailChanged, navigate, profile?.role]);
  const closeMenu = () => setMenuOpen(false);
  const closeProfile = () => setProfileOpen(false);
  const profileWrapRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => {
      if (!profileWrapRef.current?.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user || !profile?.role) return;
    const isReviewer = profile.role === "reviewer";

    // Reviewers: essays waiting on a review — submissions land as 'accepted'
    // directly ('pending' only covers rows from before the accept step was
    // removed). Applicants: finished reviews they haven't opened yet.
    const fetchCount = () => {
      let q = supabase
        .from("requests")
        .select("id", { count: "exact", head: true });
      q = isReviewer
        ? q.eq("reviewer_id", user.id).in("status", ["pending", "accepted"]).eq("payment_status", "paid")
        : q.eq("applicant_id", user.id).eq("status", "completed")
           .eq("applicant_seen", false).eq("applicant_dismissed", false);
      q.then(({ count }) => setPendingCount(count ?? 0));
    };

    fetchCount();

    const channel = supabase
      .channel("nav-bell")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "requests",
        filter: `${isReviewer ? "reviewer_id" : "applicant_id"}=eq.${user.id}`,
      }, fetchCount)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, profile?.role]);

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
                  Find Reviewers
                </Link>
              )}

              {/* Notification bell — submissions for reviewers, feedback for applicants */}
              {profile?.role && (
                <Link to="/notifications" className="nav-icon-btn" onClick={closeMenu} aria-label="Notifications">
                  <BellIcon />
                  {pendingCount > 0 && (
                    <span className="nav-badge">{pendingCount}</span>
                  )}
                </Link>
              )}

              {/* Profile avatar dropdown — desktop only */}
              <div className="nav-profile-wrap" ref={profileWrapRef}>
                <button
                  type="button"
                  className="nav-avatar-btn"
                  aria-label="Profile menu"
                  onClick={() => setProfileOpen((o) => !o)}
                >
                  <Avatar url={profile?.avatar_url} name={profile?.full_name} size={40} />
                </button>

                {profileOpen && (
                  <div className="nav-profile-dropdown">
                    <p className="nav-profile-name">{profile?.full_name || "My account"}</p>
                    <Link to={profileHref} className="nav-profile-item" onClick={() => { closeMenu(); closeProfile(); }}>
                      Profile settings
                    </Link>
                    <button
                      type="button"
                      className="nav-profile-item nav-profile-signout"
                      onClick={() => { closeMenu(); closeProfile(); signOut(); navigate("/"); }}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile-only flat links that replace the avatar dropdown in the hamburger menu */}
              <Link to={profileHref} className="nav-mobile-item" onClick={closeMenu}>
                Profile settings
              </Link>
              <button
                type="button"
                className="nav-mobile-item nav-mobile-signout"
                onClick={() => { closeMenu(); signOut(); navigate("/"); }}
              >
                Log out
              </button>
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
          <Route path="/reviewers/:id/request" element={<ProtectedRoute><RequestReview /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/requests/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
          <Route path="/feedback/:id" element={<ProtectedRoute><ApplicantFeedback /></ProtectedRoute>} />
          <Route path="/submissions/:id" element={<ProtectedRoute><SubmissionStatus /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="footer-links">
          <a href="#">About</a>
          <a href="#">Contact</a>
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
        </div>
      </footer>

      <SpeedInsights />
    </div>
  );
}
