/**
 * Thin bridge between MCP tools and the app's existing server-only Supabase
 * module. It resolves the caller from the verified OAuth bearer token and hands
 * back the same client + row mappers the app's server functions already use, so
 * no data-access logic is duplicated here.
 *
 * `src/lib/db.server.ts` is imported dynamically on purpose: the MCP entry is
 * module-evaluated at build time (manifest extraction) and on Worker cold start,
 * where server-request globals are not available.
 */
import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";

export const CONNECT_HINT =
  "This tool needs to act as your Iron Logger account. Reconnect the Iron Logger connector in Claude (Settings → Connectors) and approve access, then try again.";

type DbModule = typeof import("../db.server");

export async function dbModule(): Promise<DbModule> {
  return await import("../db.server");
}

/**
 * Verify the bearer token against Supabase Auth and return the user id.
 * The returned id is the same `auth.users.id` the app stores in `user_id`.
 */
export async function requireMcpUser(ctx: ToolContext): Promise<string> {
  const token = ctx.isAuthenticated() ? ctx.getToken() : undefined;
  if (!token) throw new ToolError(CONNECT_HINT);
  const { db } = await dbModule();
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw new ToolError(CONNECT_HINT);
  return data.user.id;
}

/** Same as `requireMcpUser`, but returns null instead of throwing. */
export async function optionalMcpUser(ctx: ToolContext): Promise<string | null> {
  try {
    return await requireMcpUser(ctx);
  } catch {
    return null;
  }
}
