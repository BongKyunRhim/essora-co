import logo from "../assets/essora_simple.png";

// The ESSORA compass logo: the uploaded compass-rose star in the middle,
// the letters of NAVIGATE placed around it, and a pin that spins on hover.
export default function CompassLogo() {
  const letters = "NAVIGATE".split("");
  const radius = 46; // how far the letters sit from the center (% of box)

  return (
    <div className="compass" aria-label="ESSORA navigate compass logo">
      <img className="compass-img" src={logo} alt="ESSORA compass" />

      {/* The spinning pin/needle, anchored at the exact center */}
      <div className="needle-wrap">
        <div className="needle" />
      </div>

      {letters.map((ch, i) => {
        const angle = (i / letters.length) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        return (
          <span
            key={i}
            className="compass-letter"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
}
