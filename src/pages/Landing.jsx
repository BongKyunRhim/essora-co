import { Link } from "react-router-dom";
import {
  SearchIcon,
  UploadIcon,
  FeedbackIcon,
  StarIcon,
} from "../components/StepIcons.jsx";

// The four "How ESSORA works" steps.
const STEPS = [
  {
    title: "Find a Reviewer",
    desc: "Filter and search a verified college student with recent admissions experience.",
    icon: <SearchIcon />,
    color: "#2563eb",
    tint: "#e8efff",
  },
  {
    title: "Upload Your Essay",
    desc: "Paste or upload a draft and pick the essay type (Common App, supplemental, or scholarship).",
    icon: <UploadIcon />,
    color: "#16a34a",
    tint: "#e6f6ec",
  },
  {
    title: "Receive Feedback",
    desc: "Receive detailed scores and personalized feedback from a reviewer.",
    icon: <FeedbackIcon />,
    color: "#7c3aed",
    tint: "#f1e9ff",
  },
  {
    title: "Improve & Rate",
    desc: "Use the feedback to revise, and rate the reviewer to build trust in the community.",
    icon: <StarIcon />,
    color: "#f59e0b",
    tint: "#fdf1dc",
  },
];

// The public landing page (what visitors see before signing in).
export default function Landing() {
  return (
    <div className="landing">
      {/* Hero: centered pitch */}
      <section className="hero">
        <div className="hero-text">
          <h1>
            Your college essay, reviewed by students{" "}
            <span className="accent">who just got in.</span>
          </h1>
          <p className="lead">
            Get personalized feedback from verified college students — affordable, authentic, and powered by real human insight.
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
      </section>

      {/* Feature checklist */}
      <section className="features">
        <div className="feature">
          <span className="check">✓</span> Verified Reviewers
        </div>
        <div className="feature">
          <span className="check">✓</span> Affordable Feedback
        </div>
        <div className="feature">
          <span className="check">✓</span> Personalized Insights
        </div>
      </section>

      {/* How it works */}
      <section className="how">
        <h2>HOW ESSORA WORKS</h2>
        <div className="how-grid">
          {STEPS.map((step) => (
            <div className="how-box" key={step.title}>
              <div className="how-head">
                <span
                  className="how-icon"
                  style={{ color: step.color, background: step.tint }}
                >
                  {step.icon}
                </span>
                <h3 className="how-title">{step.title}</h3>
              </div>
              <p className="how-desc">{step.desc}</p>
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
