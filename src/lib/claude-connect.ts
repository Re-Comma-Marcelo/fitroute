/**
 * Works out which address Claude can actually reach.
 *
 * The editor preview host is behind Lovable's login, so a connector URL built
 * from `window.location.origin` there answers 401 to Claude with no
 * explanation. Preview hosts do carry the project id, and the published app is
 * always reachable at the stable `project--<id>.lovable.app`, so we derive that
 * instead of showing a broken address. Nothing is invented: when no published
 * host can be derived we say so.
 */

export type ConnectorTarget = {
  /** Full connector URL to paste into Claude, or null when unknown. */
  url: string | null;
  /** True when the current host is a host Claude cannot reach. */
  unreachable: boolean;
  /** Host the URL was derived from, for display. */
  host: string | null;
};

const PREVIEW_MARKERS = ["id-preview--", "preview--"];

function projectIdFromPreviewHost(host: string): string | null {
  const match = /^(?:id-)?preview--([0-9a-f-]{36})/i.exec(host);
  return match?.[1] ?? null;
}

export function resolveConnectorTarget(origin: string | null): ConnectorTarget {
  if (!origin) return { url: null, unreachable: true, host: null };

  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return { url: null, unreachable: true, host: null };
  }

  const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  const isPreview =
    PREVIEW_MARKERS.some((m) => host.startsWith(m)) ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com");

  if (!isLocal && !isPreview) {
    return { url: `${origin.replace(/\/$/, "")}/mcp`, unreachable: false, host };
  }

  const projectId = projectIdFromPreviewHost(host);
  if (projectId) {
    const published = `project--${projectId}.lovable.app`;
    return { url: `https://${published}/mcp`, unreachable: true, host: published };
  }

  return { url: null, unreachable: true, host: null };
}
