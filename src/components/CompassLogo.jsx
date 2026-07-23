import logo from "../assets/essora_simple.png";

// The ESSORA compass logo — just the compass-rose star, shown large.
export default function CompassLogo() {
  return (
    <div className="compass" aria-label="ESSORA compass logo">
      <img className="compass-img" src={logo} alt="ESSORA compass" />
    </div>
  );
}
