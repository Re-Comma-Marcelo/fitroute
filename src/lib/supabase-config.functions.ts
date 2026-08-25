import { createServerFn } from "@tanstack/react-start";

/**
 * Publishable Supabase config for the browser client. The URL and publishable
 * (anon) key are public by design — the service role key never leaves the
 * server. Returns nulls when Supabase is not configured yet.
 */
export const getSupabaseBrowserConfig = createServerFn({ method: "GET" }).handler(async () => {
  const raw = process.env["FORJA_SUPABASE_URL"];
  const key = process.env["FORJA_SUPABASE_PUBLISHABLE_KEY"];
  if (!raw || !key) return { url: null as string | null, key: null as string | null };
  const url = raw.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  return { url: url as string | null, key: key as string | null };
});
