import { supabaseConfig } from "@/integrations/supabase/client";

/**
 * Exercise media lives in the public `exercise-media` bucket and the rows store
 * only the relative path (`exercise-media/loop/<slug>.webp`). Build the public
 * URL from the runtime Supabase config; absolute URLs pass through untouched.
 */
export function mediaUrl(path?: string | null): string | null {
  const raw = (path ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = supabaseConfig()?.url;
  if (!base) return null;
  const clean = raw.replace(/^\/+/, "");
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${clean}`;
}

/**
 * The static thumb sits next to the loop under the same slug, so it can be
 * derived from `midia_url` without widening the protected data layer.
 */
export function thumbPathFor(loopPath?: string | null): string | null {
  const raw = (loopPath ?? "").trim();
  if (!raw) return null;
  if (raw.includes("/thumb/")) return raw;
  if (raw.includes("/loop/")) return raw.replace("/loop/", "/thumb/");
  return null;
}

/** Public URL of the static thumb for an exercise, when it has media at all. */
export function exerciseThumbUrl(exercise: {
  midiaUrl?: string | null;
  thumbUrl?: string | null;
}): string | null {
  return mediaUrl(exercise.thumbUrl ?? thumbPathFor(exercise.midiaUrl));
}

/** Public URL of the animated execution loop, when present. */
export function exerciseLoopUrl(exercise: { midiaUrl?: string | null }): string | null {
  return mediaUrl(exercise.midiaUrl);
}
