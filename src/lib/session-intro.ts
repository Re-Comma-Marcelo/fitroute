/**
 * The brand opening that plays once when a workout starts: armed the moment a
 * new session is created, consumed by the session screen on its first paint.
 * Resuming a session in progress (or reloading it) never replays it.
 *
 * It also remembers where the last tap landed, so the opening grows out of the
 * "Start" button that was actually pressed instead of the middle of the screen.
 */

const KEY = "forja:session-intro";
/** A start slower than this (bad network) no longer reads as "from the button". */
const TAP_MAX_AGE_MS = 15_000;

export type SessionIntroOrigin = { x: number; y: number };

let lastTap: { x: number; y: number; at: number } | null = null;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => {
      lastTap = { x: e.clientX, y: e.clientY, at: Date.now() };
    },
    { capture: true, passive: true },
  );
}

/** Called right after a brand-new session is saved. */
export function armSessionIntro() {
  if (typeof window === "undefined") return;
  const tap = lastTap && Date.now() - lastTap.at < TAP_MAX_AGE_MS ? lastTap : null;
  try {
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify(tap ? { x: tap.x, y: tap.y } : { x: null, y: null }),
    );
  } catch {
    /* Private mode / storage blocked: the workout simply opens without it. */
  }
}

/**
 * Reads and clears the pending opening. `null` means don't play; otherwise
 * the tap origin (or `undefined` when unknown, which plays from the centre).
 */
export function consumeSessionIntro(): SessionIntroOrigin | undefined | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as { x: number | null; y: number | null };
    return typeof parsed.x === "number" && typeof parsed.y === "number"
      ? { x: parsed.x, y: parsed.y }
      : undefined;
  } catch {
    return null;
  }
}
