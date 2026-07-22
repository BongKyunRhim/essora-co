import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import Avatar from "./Avatar.jsx";

// Lets a user pick an image; uploads it to Supabase Storage and hands the
// public URL back via onUploaded so the page can save it on the profile.
export default function AvatarUpload({ userId, url, name, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");

    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setBusy(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Add a changing value so the browser shows the new photo, not a cached one.
    const publicUrl = `${data.publicUrl}?updated=${Date.now()}`;
    onUploaded(publicUrl);
    setBusy(false);
  }

  return (
    <div className="avatar-upload">
      <Avatar url={url} name={name} size={80} />
      <label className="linklike file-label">
        {busy ? "Uploading…" : "Change photo"}
        <input type="file" accept="image/*" onChange={handleFile} hidden />
      </label>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
