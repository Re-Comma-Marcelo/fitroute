/**
 * Works out which address Claude can actually reach.
 *
 * The editor/preview host is behind Lovable's login, so a connector URL built
 * from `window.location.origin` there answers 401/403 to Claude. When running on
 * the published app we use the current origin directly.
 *
 * For preview/localhost builds, the real published origin can be supplied via
 * the optional client env variable:
 *
 *   VITE_PUBLIC_APP_ORIGIN=https://gym-session-pro.lovable.app
 *
 * This must be the public app origin (no trailing path). When it is set, the
 * section shows `${VITE_PUBLIC_APP_ORIGIN}/mcp` as the connector URL. When it is
 * not set, no URL is shown and the user is instructed to open the screen on the
 * published app.
 */

export type ConnectorTarget = {
  /** Full connector URL to paste into Claude, or null when unknown. */
  url: string | null;
  /** True when the current host is a host Claude cannot reach. */
  unreachable: boolean;
  /** Host the URL was derived from, for display. */
  host: string | null;
};

function isInaccessibleHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return true;
  }
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com")
  );
}


function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

export function resolveConnectorTarget(origin: string | null): ConnectorTarget {
  if (!origin) return { url: null, unreachable: true, host: null };

  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return { url: null, unreachable: true, host: null };
  }

  // Published app: current origin is the source of truth.
  if (!isInaccessibleHost(host)) {
    return { url: `${normalizeOrigin(origin)}/mcp`, unreachable: false, host };
  }

  // Preview/localhost: rely on the optional published-origin env variable.
  const configuredOrigin =
    typeof import.meta.env !== "undefined" && import.meta.env["VITE_PUBLIC_APP_ORIGIN"]
      ? String(import.meta.env["VITE_PUBLIC_APP_ORIGIN"])
      : undefined;


  if (configuredOrigin) {
    const published = normalizeOrigin(configuredOrigin);
    let publishedHost: string;
    try {
      publishedHost = new URL(published).hostname;
    } catch {
      return { url: null, unreachable: true, host: null };
    }
    return { url: `${published}/mcp`, unreachable: true, host: publishedHost };
  }

  return { url: null, unreachable: true, host: null };
}
