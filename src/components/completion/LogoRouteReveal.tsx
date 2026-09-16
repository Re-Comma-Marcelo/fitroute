import { useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { interpolate } from "flubber";
import { LOGO_PATH_INNER, LOGO_PATH_OUTER, LOGO_VIEWBOX, MORPH_CIRCLE_SIZE } from "./logo-paths";
import { CHECK_RIBBON_PATH, generateRoutePaths } from "./route-path";
import type { MorphTarget } from "./ExerciseCompleteMorph";

const HOLD_MS = 220;
const ROUTE_DURATION = 0.6;
const LOGO_DURATION = 0.65;

/**
 * Phase 2: the checkmark splits into two lines that wander a short, curvy,
 * randomized route before landing exactly on the logo's two paths. Same
 * center/size the checkmark circle ended on, so the handoff from Phase 1 is
 * seamless.
 */
export function LogoRouteReveal({
  target,
  finalSize,
  onDone,
}: {
  target: MorphTarget;
  /** Display size (px) of the fully revealed logo. */
  finalSize: number;
  onDone: () => void;
}) {
  const outerRef = useRef<SVGPathElement>(null);
  const innerRef = useRef<SVGPathElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const route = generateRoutePaths();
    const toRoute = {
      outer: interpolate(CHECK_RIBBON_PATH, route.outer, { maxSegmentLength: 20 }),
      inner: interpolate(CHECK_RIBBON_PATH, route.inner, { maxSegmentLength: 20 }),
    };
    const toLogo = {
      outer: interpolate(route.outer, LOGO_PATH_OUTER, { maxSegmentLength: 20 }),
      inner: interpolate(route.inner, LOGO_PATH_INNER, { maxSegmentLength: 20 }),
    };

    let cancelled = false;
    const controls: { stop: () => void }[] = [];
    const timer = window.setTimeout(() => {
      if (cancelled) return;

      const box = boxRef.current;
      if (box) {
        controls.push(
          animate(target.size, finalSize, {
            duration: ROUTE_DURATION + LOGO_DURATION,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (size) => {
              box.style.width = `${size}px`;
              box.style.height = `${size}px`;
              box.style.left = `${target.left + target.size / 2 - size / 2}px`;
              box.style.top = `${target.top + target.size / 2 - size / 2}px`;
            },
          }),
        );
      }

      controls.push(
        animate(0, 1, {
          duration: ROUTE_DURATION,
          ease: "easeInOut",
          onUpdate: (t) => {
            outerRef.current?.setAttribute("d", toRoute.outer(t));
            // The inner line trails a beat behind — two lines walking together, not in lockstep.
            innerRef.current?.setAttribute("d", toRoute.inner(Math.max(0, t - 0.08)));
          },
          onComplete: () => {
            controls.push(
              animate(0, 1, {
                duration: LOGO_DURATION,
                ease: [0.16, 1, 0.3, 1],
                onUpdate: (t) => {
                  outerRef.current?.setAttribute("d", toLogo.outer(t));
                  innerRef.current?.setAttribute("d", toLogo.inner(Math.max(0, t - 0.08)));
                },
                onComplete: () => {
                  outerRef.current?.setAttribute("d", LOGO_PATH_OUTER);
                  innerRef.current?.setAttribute("d", LOGO_PATH_INNER);
                  onDone();
                },
              }),
            );
          },
        }),
      );
    }, HOLD_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controls.forEach((c) => c.stop());
    };
    // Runs once per mount — a fresh random route every time this phase plays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={boxRef}
      className="pointer-events-none fixed"
      style={{
        left: target.left,
        top: target.top,
        width: target.size,
        height: target.size,
      }}
    >
      <svg viewBox={LOGO_VIEWBOX} className="size-full text-primary-foreground">
        <path ref={outerRef} d={CHECK_RIBBON_PATH} fill="currentColor" />
        <path ref={innerRef} d={CHECK_RIBBON_PATH} fill="currentColor" />
      </svg>
    </div>
  );
}
