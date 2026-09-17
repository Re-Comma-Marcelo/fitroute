import { createMiddleware } from "@tanstack/react-start";
import { getSupabase, isSupabaseConfigured } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const headers = new Headers();

    // The very first server-fn call fetches the Supabase config itself, so the
    // client may not exist yet — send the call through without a bearer.
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        let {
          data: { session },
        } = await client.auth.getSession();
        // A tab backgrounded past expiry (mobile Safari/PWA throttles timers)
        // can hold a stale access token that getSession() won't refresh on its
        // own — force it here so the very next save doesn't fail with a 401.
        if (session && session.expires_at != null && session.expires_at * 1000 < Date.now()) {
          const refreshed = await client.auth.refreshSession();
          session = refreshed.data.session ?? session;
        }
        if (session?.access_token) {
          headers.set("Authorization", `Bearer ${session.access_token}`);
        }
      } catch {
        // no session available
      }
    }

    return next({ headers });
  },
);
