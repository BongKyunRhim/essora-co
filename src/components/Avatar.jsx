// Shows a profile photo, or a plain box with the person's first initial
// when there's no photo.
export default function Avatar({ url, name, size = 48 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
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
    <div className="avatar avatar-placeholder" style={style}>
      {initial}
    </div>
  );
}
