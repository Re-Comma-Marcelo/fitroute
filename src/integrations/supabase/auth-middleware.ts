import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export interface SupabaseAuthContext {
  supabase: ReturnType<typeof createClient<Database>>;
  userId: string;
  claims: Record<string, unknown>;
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];

    if (!url || !key) {
      throw new Response("Supabase not configured", { status: 500 });
    }

    const request = getRequest();
    const authHeader = request?.headers.get("Authorization") ?? "";

    if (!authHeader.startsWith("Bearer ")) {
      throw new Response("Unauthorized", { status: 401 });
    }

    const token = authHeader.slice("Bearer ".length);

    const supabase = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
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
        claims: data.user.app_metadata ?? {},
      } as SupabaseAuthContext,
    });
  },
);

