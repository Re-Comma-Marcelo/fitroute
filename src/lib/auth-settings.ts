import { supabaseConfig } from "@/integrations/supabase/client";

export interface AuthSettings {
  /** Providers the project actually has enabled, keyed by name ("google", …). */
  providers: Record<string, boolean>;
  /** Account creation is turned off for the whole project. */
  signupDisabled: boolean;
}

let cache: Promise<AuthSettings | null> | null = null;

/**
 * GoTrue publishes the project's auth configuration at /auth/v1/settings.
 * The sign-in screen reads it so it never offers a door that cannot open — a
 * Google button for a provider that is not enabled, or a "Create account" tab
 * on a project where sign-ups are off.
 *
 * Returns null when the endpoint cannot be reached; callers keep their
 * optimistic defaults in that case.
 */
export function fetchAuthSettings(): Promise<AuthSettings | null> {
  // Not cached while the browser client has no config yet: the answer would be
  // a null that never refreshes.
  if (!supabaseConfig()) return Promise.resolve(null);
  if (!cache) cache = load();
  return cache;
}

async function load(): Promise<AuthSettings | null> {
  const config = supabaseConfig();
  if (!config) return null;
  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      external?: Record<string, boolean>;
      disable_signup?: boolean;
    };
    return {
      providers: body.external ?? {},
      signupDisabled: body.disable_signup === true,
    };
  } catch {
    return null;
  }
}
