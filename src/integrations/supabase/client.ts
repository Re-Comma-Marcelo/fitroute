import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const url = import.meta.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Supabase URL and publishable key are missing. Connect Supabase in Project Settings → Integrations.",
  );
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
