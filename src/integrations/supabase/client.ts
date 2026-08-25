import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The browser client is configured at runtime: the project's Supabase URL and
 * publishable key live in server-side env, and the root route hands them to
 * configureSupabase() before any route renders. `supabase` is a lazy proxy so
 * existing `supabase.auth.*` imports keep working.
 */
let client: SupabaseClient | null = null;
let config: { url: string; key: string } | null = null;

export function configureSupabase(next: { url: string; key: string } | null) {
  if (!next?.url || !next?.key) return;
  if (config && config.url === next.url && config.key === next.key) return;
  config = next;
  client = null;
}

export const isSupabaseConfigured = () => Boolean(config);

export function getSupabase(): SupabaseClient {
  if (!config) {
    throw new Error(
      "Supabase is not configured: FORJA_SUPABASE_URL / FORJA_SUPABASE_PUBLISHABLE_KEY are missing.",
    );
  }
  if (!client) {
    client = createClient(config.url, config.key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: "forja-auth",
      },
    });
  }
  return client;
}

export function assertSupabaseConfigured() {
  getSupabase();
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = getSupabase()[prop as keyof SupabaseClient];
    return typeof value === "function" ? (value as Function).bind(getSupabase()) : value;
  },
}) as SupabaseClient;
