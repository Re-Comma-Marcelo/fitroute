import { useRef, useState } from "react";

import { hapticTick } from "@/lib/haptics";

/** How long the finger must stay down before sliding starts changing the value. */
const HOLD_MS = 180;
/** Vertical pixels per step: comfortable for a thumb, still precise. */
const PX_PER_STEP = 14;
/** Past this distance each step counts as a big jump instead of a single one. */
const BIG_JUMP_PX = 90;

export type ScrubStep = (direction: 1 | -1, big: boolean) => void;

type ScrubState = { active: boolean; delta: string };

/**
 * Hold a number and slide up or down to change it. A plain tap is left alone so
 * the keyboard still opens and typing keeps working.
 */
export function useValueScrub(
  onStep: ScrubStep | undefined,
  formatDelta: (steps: number) => string,
) {
  const [state, setState] = useState<ScrubState>({ active: false, delta: "" });
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startY = useRef(0);
  const applied = useRef(0);
  const scrubbed = useRef(false);
  const armed = useRef(false);

  function reset() {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
    armed.current = false;
    applied.current = 0;
    setState({ active: false, delta: "" });
  }

  if (!onStep) {
    return {
      scrubbing: false,
      deltaLabel: "",
      handlers: {} as Record<string, never>,
    };
  }

  return {
    scrubbing: state.active,
    deltaLabel: state.delta,
    handlers: {
      onPointerDown: (e: React.PointerEvent<HTMLInputElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        startY.current = e.clientY;
        applied.current = 0;
        scrubbed.current = false;
        const target = e.currentTarget;
        hold.current = setTimeout(() => {
          armed.current = true;
          try {
            target.setPointerCapture(e.pointerId);
          } catch {
            // Capture is a nicety; the gesture still works without it.
          }
          hapticTick();
          setState({ active: true, delta: formatDelta(0) });
        }, HOLD_MS);
      },
      onPointerMove: (e: React.PointerEvent<HTMLInputElement>) => {
        const dy = startY.current - e.clientY;
        if (!armed.current) {
          // Moving before the hold completes means the user is scrolling.
          if (Math.abs(dy) > 8) reset();
          return;
        }
        e.preventDefault();
        const big = Math.abs(dy) > BIG_JUMP_PX;
        const wanted = Math.trunc(dy / PX_PER_STEP);
        let diff = wanted - applied.current;
        if (diff === 0) return;
        const direction: 1 | -1 = diff > 0 ? 1 : -1;
        while (diff !== 0) {
          onStep(direction, big);
          diff -= direction;
        }
        applied.current = wanted;
        scrubbed.current = true;
        hapticTick();
        setState({ active: true, delta: formatDelta(wanted) });
      },
      onPointerUp: (e: React.PointerEvent<HTMLInputElement>) => {
        if (armed.current) {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            // Ignore: the pointer may already be released.
          }
        }
        reset();
      },
      onPointerCancel: reset,
      onClick: (e: React.MouseEvent<HTMLInputElement>) => {
        // After sliding, don't pop the keyboard open on release.
        if (scrubbed.current) {
          e.preventDefault();
          e.currentTarget.blur();
          scrubbed.current = false;
        }
      },
    },
  };
}

const HINT_KEY = "forja.scrubHint.v1";
const HINT_LIMIT = 3;

/** The hint fades out of the app after a few sessions instead of nagging forever. */
export function shouldShowScrubHint(): boolean {
  try {
    return Number(localStorage.getItem(HINT_KEY) ?? "0") < HINT_LIMIT;
  } catch {
    return false;
  }
}

export function markScrubHintShown() {
  try {
    const seen = Number(localStorage.getItem(HINT_KEY) ?? "0");
    localStorage.setItem(HINT_KEY, String(seen + 1));
  } catch {
    // Private browsing: showing the hint again is harmless.
  }
}
