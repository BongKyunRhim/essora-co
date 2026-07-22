import { Routes, Route, Navigate, Link } from "react-router-dom";
import SignUp from "../pages/SignUp.jsx";
import Login from "../pages/Login.jsx";

// App is the shell that holds the whole site together.
// It defines every route and lets you navigate between the pages.
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          ESSORA
        </Link>
        <nav className="app-nav">
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}
