import { useEffect, useRef } from "react";

import { hapticTick } from "@/lib/haptics";

/** How long the finger must stay on the button before it starts repeating. */
const HOLD_MS = 400;
/** First gap between repeats; it shrinks so a long hold covers ground fast. */
const FIRST_INTERVAL_MS = 180;
const MIN_INTERVAL_MS = 60;
const SPEED_UP = 0.85;

/**
 * −/+ buttons that repeat while held: a tap is one step, holding keeps stepping
 * and speeds up, so 60 → 80 kg is one press instead of eight. Starting a scroll
 * on the button cancels the hold (the browser fires pointercancel), so the value
 * never moves by accident. Keyboard activation still fires a single step.
 */
export function useHoldRepeat(onStep: () => void) {
  const latest = useRef(onStep);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeated = useRef(false);

  // Each step re-renders with the new value; always call the freshest closure.
  useEffect(() => {
    latest.current = onStep;
  }, [onStep]);

  useEffect(() => stop, []);

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function step() {
    latest.current();
    hapticTick();
  }

  function tick(interval: number) {
    step();
    timer.current = setTimeout(
      () => tick(Math.max(MIN_INTERVAL_MS, interval * SPEED_UP)),
      interval,
    );
  }

  return {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      stop();
      repeated.current = false;
      timer.current = setTimeout(() => {
        repeated.current = true;
        tick(FIRST_INTERVAL_MS);
      }, HOLD_MS);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    // A long press must not open the text-selection / context menu.
    onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault(),
    onClick: () => {
      // The hold already stepped; the click that ends it must not add one more.
      if (repeated.current) {
        repeated.current = false;
        return;
      }
      step();
    },
  };
}
