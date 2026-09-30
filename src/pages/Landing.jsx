import { Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
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
    desc: "Browse real college students who just went through admissions, and pick the one who feels right for you.",
    icon: <SearchIcon />,
    color: "#1e3355",
    tint: "#e8edf5",
  },
  {
    num: "02",
    title: "Upload Your Essay",
    desc: "Paste or upload your draft and tell us what kind of essay it is — Common App, supplemental, or scholarship.",
    icon: <UploadIcon />,
    color: "#8fa6c6",
    tint: "#f1f3f7",
  },
  {
    num: "03",
    title: "Get Your Feedback",
    desc: "Your reviewer reads every line and sends back honest suggestions, scores, and advice written just for you.",
    icon: <FeedbackIcon />,
    color: "#1e3355",
    tint: "#e8edf5",
  },
  {
    num: "04",
    title: "Improve & Rate",
    desc: "Use what you learned to make your essay shine — then rate your reviewer to help other students find them.",
    icon: <StarIcon />,
    color: "#8fa6c6",
    tint: "#f1f3f7",
  },
];

// The public landing page (what visitors see before signing in).
export default function Landing() {
  const { user } = useAuth();
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
            Real feedback from college students who were in your shoes a year
            ago — honest, personal, and way more affordable than a consultant.
          </p>
          {!user && (
            <div className="hero-buttons">
              <Link className="btn" to="/signup">
                Improve my essay
              </Link>
              <Link className="btn" to="/signup">
                Become a reviewer
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Feature tags divider */}
      <section className="tags-bar">
        <span className="tag">Verified Reviewers</span>
        <span className="tag-dot" />
        <span className="tag">Real Human Feedback</span>
        <span className="tag-dot" />
        <span className="tag">Affordable</span>
        <span className="tag-dot" />
        <span className="tag">Quick Turnaround</span>
        <span className="tag-dot" />
        <span className="tag">Personalized Insights</span>
      </section>

      {/* How it works */}
      <section className="how">
        <h2>HOW ESSORA WORKS</h2>
        <div className="how-grid">
          {STEPS.map((step) => (
            <div className="how-box" key={step.title}>
              <span className="how-num">{step.num}</span>
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

    </div>
  );
}
