import { useEffect } from "react";
import { hapticRestDone } from "./haptics";
import { playRestBeep } from "./rest-audio";

/**
 * Fires when the persisted rest countdown runs out, wherever it is mounted.
 *
 * `live` is true when the countdown expired while the hook was mounted (sound +
 * vibration + overlay) and false when it had already expired before mounting
 * (stale rest from a closed app: clear it silently).
 *
 * Pass `enabled: false` to let another mounted consumer own the feedback and
 * avoid a double beep.
 */
export function useRestExpiry(
  restEndsAt: number | null | undefined,
  onExpire: (live: boolean) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || !restEndsAt) return;
    const msLeft = restEndsAt - Date.now();
    if (msLeft <= 0) {
      onExpire(false);
      return;
    }
    const id = setTimeout(() => {
      onExpire(true);
      playRestBeep();
      hapticRestDone();
    }, msLeft);
    return () => clearTimeout(id);
    // onExpire is a stable useCallback in both consumers.
  }, [restEndsAt, enabled, onExpire]);
}
