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
    num: "01",
    title: "Find a Reviewer",
    desc: "Filter and search a verified college student with recent admissions experience.",
    icon: <SearchIcon />,
    grad: "linear-gradient(135deg, #4f83e3, #6ec6a8)",
  },
  {
    num: "02",
    title: "Upload Your Essay",
    desc: "Paste or upload a draft and pick the essay type (Common App, supplemental, or scholarship).",
    icon: <UploadIcon />,
    grad: "linear-gradient(135deg, #38a56f, #7cc9e8)",
  },
  {
    num: "03",
    title: "Receive Feedback",
    desc: "Receive detailed scores and personalized feedback from a reviewer.",
    icon: <FeedbackIcon />,
    grad: "linear-gradient(135deg, #8b6ce3, #64b5e8)",
  },
  {
    num: "04",
    title: "Improve & Rate",
    desc: "Use the feedback to revise, and rate the reviewer to build trust in the community.",
    icon: <StarIcon />,
    grad: "linear-gradient(135deg, #e8a23c, #e87a6c)",
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
        <h1>HOW ESSORA WORKS</h1>
        <p className="how-sub">
          A simple, transparent path from rough draft to a polished, authentic
          essay.
        </p>
        <div className="how-grid">
          {STEPS.map((step) => (
            <div className="how-box" key={step.title}>
              <span className="how-num">{step.num}</span>
              <div className="how-head">
                <span className="how-icon" style={{ background: step.grad }}>
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
