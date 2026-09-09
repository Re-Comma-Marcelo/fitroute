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
import { OAUTH_ISSUER, SUPABASE_ORIGIN } from "./issuer";

export const CONNECT_HINT =
  "This tool needs to act as your ROUTE account. Reconnect the ROUTE connector in Claude (Settings → Connectors) and approve access, then try again.";

type DbModule = typeof import("../db.server");

export async function dbModule(): Promise<DbModule> {
  return await import("../db.server");
}

const EXPECTED_AUDIENCES = new Set(["authenticated"]);

function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Fail closed on anything ambiguous: the token must be a JWT issued by *this*
 * Supabase project's auth server, for the `authenticated` audience, and not
 * expired. A token minted by any other issuer is rejected before it ever
 * reaches the database.
 */
function assertTrustedToken(token: string): void {
  const parts = token.split(".");
  if (parts.length !== 3) throw new ToolError(CONNECT_HINT);

  const claims = decodeSegment(parts[1] as string);
  if (!claims) throw new ToolError(CONNECT_HINT);

  const iss = typeof claims["iss"] === "string" ? claims["iss"].replace(/\/+$/, "") : "";
  if (iss !== OAUTH_ISSUER && iss !== `${SUPABASE_ORIGIN}/auth/v1`) {
    throw new ToolError(CONNECT_HINT);
  }

  const aud = claims["aud"];
  const audiences = Array.isArray(aud) ? aud : [aud];
  if (!audiences.some((a) => typeof a === "string" && EXPECTED_AUDIENCES.has(a))) {
    throw new ToolError(CONNECT_HINT);
  }

  const exp = claims["exp"];
  if (typeof exp !== "number" || exp * 1000 <= Date.now()) {
    throw new ToolError(CONNECT_HINT);
  }

  const sub = claims["sub"];
  if (typeof sub !== "string" || !sub) throw new ToolError(CONNECT_HINT);
}

/**
 * Verify the bearer token against Supabase Auth and return the user id.
 * The returned id is the same `auth.users.id` the app stores in `user_id`.
 */
export async function requireMcpUser(ctx: ToolContext): Promise<string> {
  const token = ctx.isAuthenticated() ? ctx.getToken() : undefined;
  if (!token) throw new ToolError(CONNECT_HINT);

  assertTrustedToken(token);

  const { db } = await dbModule();
  let result: Awaited<ReturnType<ReturnType<typeof db>["auth"]["getUser"]>>;
  try {
    result = await db().auth.getUser(token);
  } catch {
    // Auth server unreachable / not configured: refuse rather than degrade.
    throw new ToolError(CONNECT_HINT);
  }
  if (result.error || !result.data.user) throw new ToolError(CONNECT_HINT);
  return result.data.user.id;
}

/**
 * Returns the caller's user id, or null when the request carried no
 * credentials at all. A request that *does* present a token still has to pass
 * full verification — an invalid or untrusted token throws instead of silently
 * degrading to anonymous access.
 */
export async function optionalMcpUser(ctx: ToolContext): Promise<string | null> {
  const token = ctx.isAuthenticated() ? ctx.getToken() : undefined;
  if (!token) return null;
  return await requireMcpUser(ctx);
}
