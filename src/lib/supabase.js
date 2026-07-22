import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// True once you've pasted real values into config.js.
export const isSupabaseConfigured =
  !SUPABASE_URL.includes("YOUR-PROJECT") &&
  !SUPABASE_ANON_KEY.includes("YOUR-ANON-KEY");

// The single client the whole app uses to talk to the database + auth.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
