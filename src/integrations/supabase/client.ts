import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const url = import.meta.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"];
const key =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
  process.env["SUPABASE_PUBLISHABLE_KEY"];

// Fallback placeholders keep module evaluation from throwing before Supabase is
// connected — assertSupabaseConfigured() reports the real problem at call time.
export const supabase = createClient<Database>(
  url ?? "https://placeholder.supabase.co",
  key ?? "placeholder-key",
  {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  },
);

export const isSupabaseConfigured = Boolean(url && key);

export function assertSupabaseConfigured() {
  if (!url || !key) {
    throw new Error(
      "Supabase URL and publishable key are missing. Connect Supabase in Project Settings → Integrations.",
    );
  }
}

