/**
 * Effort (RPE) scale: the values, what each one means in plain words, and the
 * local preference that decides whether we ask right after a set is ticked.
 * Local only: no backend, no migration.
 */

export const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

export type RpeValue = (typeof RPE_VALUES)[number];

/**
 * Shared effort thresholds — used across progression, autoregulation and
 * coaching so "was that easy/hard/fatigued" means the same thing everywhere
 * instead of drifting between files (some used 8.5, others 8 or 9.5 for
 * essentially the same question).
 */
/** At/below this, the last effort had real reps in reserve — safe to add load. */
export const RPE_EASY_MAX = 8;
/** At/above this sustained across sessions, effort is creeping toward overreaching. */
export const RPE_FATIGUE_MIN = 8.5;
/** At/above this, essentially no reps were left — hold or deload, don't add load. */
export const RPE_NEAR_FAILURE_MIN = 9.5;

/** English keys: the dictionary translates them to pt/nl. */
const MEANING: Record<string, string> = {
  "10": "Nothing left — no way you could do another rep",
  "9.5": "Maybe one more rep",
  "9": "One more rep for sure",
  "8.5": "Maybe two more reps",
  "8": "Two more reps for sure",
  "7.5": "Two to three more reps",
  "7": "Three more reps",
  "6.5": "Three to four more reps",
  "6": "Easy — four or more reps left",
};

export function rpeMeaning(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return MEANING[String(Number(value))] ?? null;
}

/** Closest scale value to any position between 6 and 10. */
export function snapRpe(raw: number): RpeValue {
  let best: RpeValue = RPE_VALUES[0];
  for (const value of RPE_VALUES) {
    if (Math.abs(value - raw) < Math.abs(best - raw)) best = value;
  }
  return best;
}

const ASK_KEY = "forja.askRpe.v1";

export function askRpeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ASK_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setAskRpeEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ASK_KEY, on ? "1" : "0");
  } catch {
    // ignore
  }
}
