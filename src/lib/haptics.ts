/**
 * Short haptic feedback for physical gym interactions.
 * Silent where the Vibration API is missing (iOS Safari) or when the user
 * turned vibration off in Profile.
 */

const KEY = "forja.haptics";

export function hapticsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) !== "off";
}

export function setHapticsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, enabled ? "on" : "off");
}

function buzz(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (!hapticsEnabled()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

/** Marking a set as done: a single crisp tick. */
export function hapticTick() {
  buzz(15);
}

/** New personal record: two quick ticks, still short. */
export function hapticSuccess() {
  buzz([15, 60, 15]);
}

/** Rest finished: the long, unmistakable pattern. */
export function hapticRestDone() {
  buzz([300, 150, 300, 150, 500]);
}
