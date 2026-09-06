import { useRef, useState } from "react";

import { hapticTick } from "@/lib/haptics";

/** How long the finger must stay down before sliding starts changing the value. */
const HOLD_MS = 180;
/** Vertical pixels per step: comfortable for a thumb, still precise. */
const PX_PER_STEP = 14;
/** Distance at which the gesture leaves the fine step behind. */
const COARSE_PX = 70;
/** Distance at which the gesture takes the biggest jumps. */
const COARSEST_PX = 140;

export type ScrubTier = "fine" | "coarse" | "coarsest";

/** Picks how much one step is worth for how far the finger has travelled. */
export function scrubTier(distancePx: number): ScrubTier {
  if (distancePx >= COARSEST_PX) return "coarsest";
  if (distancePx >= COARSE_PX) return "coarse";
  return "fine";
}

type ScrubState = { active: boolean; value: string; step: string };

export type ScrubOptions = {
  /** Value the gesture starts from, read at the moment the finger lands. */
  getValue: () => number;
  /** Step size for the current tier — bigger the further the finger travels. */
  stepFor: (tier: ScrubTier) => number;
  /** Applies the value while the finger moves. */
  onValue: (value: number) => void;
  /** Live label for the resulting value, e.g. "180 kg". */
  formatValue: (value: number, delta: number) => string;
  /** Live label for the active step, e.g. "step 20". */
  formatStep: (step: number, tier: ScrubTier) => string;
  /** Lowest value the gesture may reach. Defaults to 0. */
  min?: number;
};

/**
 * Hold a number and slide up or down to change it. Steps grow with the distance
 * travelled, so a leg press reaches 180 kg in one gesture while a curl still
 * moves 2.5 kg at a time. A plain tap is left alone so typing keeps working.
 */
export function useValueScrub(options: ScrubOptions | undefined) {
  const [state, setState] = useState<ScrubState>({ active: false, value: "", step: "" });
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startY = useRef(0);
  const base = useRef(0);
  const applied = useRef(0);
  const tier = useRef<ScrubTier>("fine");
  const scrubbed = useRef(false);
  const armed = useRef(false);

  function reset() {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
    armed.current = false;
    applied.current = 0;
    tier.current = "fine";
    setState({ active: false, value: "", step: "" });
  }

  if (!options) {
    return {
      scrubbing: false,
      valueLabel: "",
      stepLabel: "",
      handlers: {} as Record<string, never>,
    };
  }

  const { getValue, stepFor, onValue, formatValue, formatStep, min = 0 } = options;

  /** Snaps to the step in use so the field never keeps an odd leftover number. */
  function quantize(value: number, step: number) {
    if (step <= 0) return value;
    return Math.round(Math.round(value / step) * step * 1000) / 1000;
  }

  return {
    scrubbing: state.active,
    valueLabel: state.value,
    stepLabel: state.step,
    handlers: {
      onPointerDown: (e: React.PointerEvent<HTMLInputElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        startY.current = e.clientY;
        applied.current = 0;
        tier.current = "fine";
        scrubbed.current = false;
        const target = e.currentTarget;
        hold.current = setTimeout(() => {
          armed.current = true;
          base.current = getValue();
          try {
            target.setPointerCapture(e.pointerId);
          } catch {
            // Capture is a nicety; the gesture still works without it.
          }
          hapticTick();
          const step = stepFor("fine");
          setState({
            active: true,
            value: formatValue(base.current, 0),
            step: formatStep(step, "fine"),
          });
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
        const nextTier = scrubTier(Math.abs(dy));
        const step = stepFor(nextTier);
        const steps = Math.trunc(dy / PX_PER_STEP);
        const raw = base.current + steps * step;
        const next = Math.max(min, quantize(raw, step));
        const tierChanged = nextTier !== tier.current;
        if (!tierChanged && steps === applied.current) return;
        if (tierChanged) {
          // A different rhythm deserves a different nudge on the wrist.
          hapticTick();
          hapticTick();
          tier.current = nextTier;
        } else {
          hapticTick();
        }
        applied.current = steps;
        scrubbed.current = true;
        onValue(next);
        setState({
          active: true,
          value: formatValue(next, Math.round((next - base.current) * 1000) / 1000),
          step: formatStep(step, nextTier),
        });
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
