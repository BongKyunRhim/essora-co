import { Link } from "react-router-dom";
import CompassLogo from "../components/CompassLogo.jsx";

// The public landing page (what visitors see before signing in).
// Text is placeholder for now — replace the gibberish when copy is ready.
export default function Landing() {
  return (
    <div className="landing">
      {/* Hero: pitch on the left, compass logo on the right */}
      <section className="hero">
        <div className="hero-text">
          <h1>
            Your college essay, reviewed by students who just got in.
          </h1>
          <p className="lead">
            Get personalized feedback from verified college students who recently went through the application process — affordable, authentic, and powered by real human insight.
          </p>
          <div className="hero-buttons">
            <Link className="btn" to="/signup">
              Improve your essay
            </Link>
            <Link className="btn" to="/signup">
              Become a reviewer
            </Link>
          </div>
        </div>

        <div className="hero-logo">
          <CompassLogo />
        </div>
      </section>

      {/* Feature checklist */}
      <section className="features">
        <div className="feature">
          <span className="check">✓</span> Verified reviewers
        </div>
        <div className="feature">
          <span className="check">✓</span> Affordable feedback
        </div>
        <div className="feature">
          <span className="check">✓</span> Personalized insights
        </div>
      </section>

      {/* How it works */}
      <section className="how">
        <h2>HOW ESSORA WORKS</h2>
        <div className="how-grid">
          {[1, 2, 3, 4].map((n) => (
            <div className="how-box" key={n}>
              <span className="how-num">{n}.</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer (placeholder links) */}
      <footer className="landing-footer">
        <div className="footer-links">
          <a href="#">About</a>
          <a href="#">Contact</a>
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
        </div>
      </footer>
    </div>
  );
}
