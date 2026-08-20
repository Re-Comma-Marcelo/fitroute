import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

export const supabaseAdmin = createClient<Database>(url ?? "", key ?? "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function assertSupabaseAdminConfigured() {
  if (!url || !key) {
    throw new Error(
      "Supabase URL and service role key are missing. Connect Supabase in Project Settings → Integrations.",
    );
  }
}

