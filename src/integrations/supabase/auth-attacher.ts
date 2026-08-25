import { createMiddleware } from "@tanstack/react-start";
import { getSupabase, isSupabaseConfigured } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const headers = new Headers();

    // The very first server-fn call fetches the Supabase config itself, so the
    // client may not exist yet — send the call through without a bearer.
    if (isSupabaseConfigured()) {
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
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
