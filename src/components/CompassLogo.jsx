// The ESSORA compass logo: an 8-point star with the letters of NAVIGATE
// placed around it, and a pin in the middle that spins when you hover.
export default function CompassLogo() {
  const letters = "NAVIGATE".split("");
  const radius = 44; // how far the letters sit from the center (% of box)

  return (
    <div className="compass" aria-label="ESSORA navigate compass logo">
      <svg className="compass-star" viewBox="0 0 200 200" aria-hidden="true">
        {/* Cardinal (long) points */}
        <polygon points="100,8 110,90 192,100 110,110 100,192 90,110 8,100 90,90" />
        {/* Diagonal (shorter) points, rotated 45° */}
        <polygon
          points="100,40 107,93 160,100 107,107 100,160 93,107 40,100 93,93"
          transform="rotate(45 100 100)"
        />
      </svg>

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
