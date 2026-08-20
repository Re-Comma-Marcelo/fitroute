import { createMiddleware } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export interface SupabaseAuthContext {
  supabase: ReturnType<typeof createClient<Database>>;
  userId: string;
  claims: Record<string, unknown>;
}

export const requireSupabaseAuth = createMiddleware().server(async ({ next }) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Response("Supabase not configured", { status: 500 });
  }

  const request = new Request("http://localhost");
  // @ts-expect-error TanStack exposes request through context internally
  const realRequest = (typeof request !== "undefined" && (request as Request)) || undefined;

  const authHeader =
    realRequest instanceof Request ? realRequest.headers.get("Authorization") ?? "" : "";

  if (!authHeader.startsWith("Bearer ")) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length);
  const supabase = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("Authorization", `Bearer ${token}`);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return next({
    context: {
      supabase,
      userId: data.user.id,
      claims: {},
    } as SupabaseAuthContext,
  });
});
