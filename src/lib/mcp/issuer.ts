/**
 * Public origin of this app's Supabase project — the OAuth 2.1 issuer for the
 * MCP server. Not a secret: it is already public in the browser bundle and in
 * the Supabase discovery document. Kept as a constant so the MCP manifest can
 * be generated at build time without depending on an env var.
 *
 * `VITE_FORJA_SUPABASE_URL` still wins when it is defined, so the server can be
 * pointed at another Supabase project without editing this file.
 */
const DEFAULT_SUPABASE_ORIGIN = "https://goltxxpjfazehknblwak.supabase.co";

const configured = (import.meta.env["VITE_FORJA_SUPABASE_URL"] as string | undefined)?.replace(
  /\/+$/,
  "",
);

export const SUPABASE_ORIGIN = configured || DEFAULT_SUPABASE_ORIGIN;

export const OAUTH_ISSUER = `${SUPABASE_ORIGIN}/auth/v1`;
