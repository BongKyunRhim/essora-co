export default function Avatar({ url, name, size = 48 }) {
  const style = { width: size, height: size };

  if (url) {
    return (
      <img
        className="avatar"
        src={url}
        alt={name || "profile photo"}
        style={style}
      />
    );
  }

  return (
    <svg
      className="avatar avatar-placeholder"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={style}
      aria-label="No profile photo"
    >
      <rect width="100" height="100" fill="#d9d9d9" />
      {/* head — bottom edge at y=47 */}
      <circle cx="50" cy="31" r="16" fill="#b3b3b3" />
      {/* shoulders — top edge at y=54, clear gap from head */}
      <circle cx="50" cy="92" r="38" fill="#b3b3b3" />
    </svg>
  );
}
