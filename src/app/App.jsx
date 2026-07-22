import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import SignUp from "../pages/SignUp.jsx";
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import ReviewerHome from "../pages/ReviewerHome.jsx";
import ApplicantHome from "../pages/ApplicantHome.jsx";
import Account from "../pages/Account.jsx";
import ReviewerDetail from "../pages/ReviewerDetail.jsx";

// Only lets logged-in users through; otherwise sends them to the login page.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="page">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// App is the shell that holds the whole site together.
export default function App() {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
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
                <Link to="/reviewer">My profile</Link>
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
