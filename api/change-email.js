import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { newEmail } = req.body ?? {};
  if (!newEmail) return res.status(400).json({ error: "newEmail is required" });

  const adminClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authError } = await adminClient.auth.getUser(
    authHeader.slice(7)
  );
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: true,
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
