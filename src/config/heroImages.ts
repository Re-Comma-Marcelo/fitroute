/**
 * Hero and routine photos. Photos are pre-processed (turquoise duotone,
 * motion blur, orange accents kept) — never add CSS colour filters on top.
 *
 * Every entry points at the same placeholder for now: drop the real files in
 * src/assets/ and swap the imports below.
 */
import placeholder from "@/assets/hero-placeholder.jpg";

export type SessionType =
  "push" | "pull" | "upper" | "lower" | "legs" | "fullBody" | "run" | "default";

export const heroImages = {
  home: placeholder,
  session: {
    push: placeholder,
    pull: placeholder,
    upper: placeholder,
    lower: placeholder,
    legs: placeholder,
    fullBody: placeholder,
    run: placeholder,
    default: placeholder,
  } satisfies Record<SessionType, string>,
};

/** Keyword match on the routine name (EN / PT / NL), first hit wins. */
const KEYWORDS: [SessionType, RegExp][] = [
  ["fullBody", /full[\s-]?body|corpo inteiro|hele lichaam|total/i],
  ["push", /push|empurr|duw|peito|chest|borst/i],
  ["pull", /pull|pux|trek|costas|back|rug/i],
  ["upper", /upper|superior|boven/i],
  ["lower", /lower|inferior|onder/i],
  ["legs", /leg|perna|been|squat|agacha/i],
  ["run", /run|corr|hardloop|cardio|jog/i],
];

export function sessionType(routineName: string | null | undefined): SessionType {
  if (!routineName) return "default";
  return KEYWORDS.find(([, re]) => re.test(routineName))?.[0] ?? "default";
}

/** Hero photo for a session/routine (also used for routine thumbnails). */
export function sessionImage(routineName: string | null | undefined): string {
  return heroImages.session[sessionType(routineName)];
}
