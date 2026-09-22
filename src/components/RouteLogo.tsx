import { useEffect, useState } from "react";

import {
  LOGO_CENTERLINE_INNER,
  LOGO_CENTERLINE_OUTER,
  LOGO_PATH_INNER,
  LOGO_PATH_OUTER,
  LOGO_STROKE_WIDTH,
  LOGO_VIEWBOX_MARK,
} from "@/components/completion/logo-paths";
import { cn } from "@/lib/utils";

/**
 * The Route mark: two lines, purple outside and white inside, tracing the
 * same R. Inline SVG from the logo's own vectors, so it scales, takes the
 * theme colours and weighs nothing. The PNG stays for the PWA icons only.
 */
export function RouteMark({
  className,
  title,
}: {
  className?: string | undefined;
  /** Leave unset for decorative use next to the wordmark. */
  title?: string | undefined;
}) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX_MARK}
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={LOGO_PATH_OUTER} className="fill-primary" />
      <path d={LOGO_PATH_INNER} className="fill-foreground" />
    </svg>
  );
}

/**
 * The mark as a route being travelled: both lines draw themselves up to
 * `progress` (0-100), the white one a step behind the purple, with a dot at
 * the tip. At 100 it settles into the exact mark.
 */
export function RouteMarkProgress({
  progress,
  className,
  label,
  animated = true,
}: {
  progress: number;
  className?: string | undefined;
  /** Accessible name; the element reports `progress` as a progressbar. */
  label?: string | undefined;
  /** False renders the current state with no transition (reduced motion). */
  animated?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const [reduced, setReduced] = useState(false);
  // Settled = the full mark. Starts settled only when mounted at 100.
  const [settled, setSettled] = useState(clamped >= 100);
  const [outerRef, setOuterRef] = useState<SVGPathElement | null>(null);

  useEffect(() => {
    setReduced(Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  }, []);

  const instant = reduced || !animated;

  useEffect(() => {
    if (clamped < 100) {
      setSettled(false);
      return;
    }
    if (instant) setSettled(true);
  }, [clamped, instant]);

  useEffect(() => {
    if (!outerRef) return;
    const total = outerRef.getTotalLength();
    const point = outerRef.getPointAtLength((clamped / 100) * total);
    setTip({ x: point.x, y: point.y });
  }, [outerRef, clamped]);

  const outerOffset = 100 - clamped;
  const innerOffset = 100 - (clamped >= 100 ? 100 : Math.max(0, clamped - 6));
  const transition = instant ? "none" : "stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <svg
      viewBox={LOGO_VIEWBOX_MARK}
      className={cn("size-8 shrink-0 overflow-visible", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
    >
      {settled ? (
        <>
          <path d={LOGO_PATH_OUTER} className="fill-primary" />
          <path d={LOGO_PATH_INNER} className="fill-foreground" />
        </>
      ) : (
        <>
          <g
            fill="none"
            strokeWidth={LOGO_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={LOGO_CENTERLINE_OUTER} className="stroke-primary" opacity={0.14} />
            <path d={LOGO_CENTERLINE_INNER} className="stroke-foreground" opacity={0.08} />
            <path
              ref={setOuterRef}
              d={LOGO_CENTERLINE_OUTER}
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={outerOffset}
              style={{ transition }}
              className="stroke-primary"
              onTransitionEnd={() => {
                if (clamped >= 100) setSettled(true);
              }}
            />
            <path
              d={LOGO_CENTERLINE_INNER}
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={innerOffset}
              style={{ transition, transitionDelay: instant ? "0ms" : "80ms" }}
              className="stroke-foreground"
            />
          </g>
          {tip && clamped > 0 && clamped < 100 ? (
            <circle
              cx={tip.x}
              cy={tip.y}
              r={56}
              className="fill-foreground stroke-background"
              strokeWidth={24}
              style={{ transition: instant ? "none" : "cx 600ms, cy 600ms" }}
            />
          ) : null}
        </>
      )}
    </svg>
  );
}

/** The mark drawing itself once, from empty to whole, when it appears. */
export function RouteMarkDraw({
  className,
  label,
}: {
  className?: string | undefined;
  label?: string | undefined;
}) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setProgress(100));
    return () => window.cancelAnimationFrame(id);
  }, []);
  return <RouteMarkProgress progress={progress} className={className} label={label} />;
}

/** Same name and props as before; the PNG is gone, the vectors took over. */
export function RouteLogo({
  className,
  title,
}: {
  className?: string | undefined;
  title?: string | undefined;
}) {
  return <RouteMark className={className} title={title} />;
}

/**
 * Mark on the dark app tile, matching the installed home-screen icon.
 * `draw` makes it trace itself once, for the login screen.
 */
export function RouteLogoTile({ className, draw = false }: { className?: string; draw?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-b from-surface-2 to-background",
        className,
      )}
    >
      {draw ? <RouteMarkDraw className="size-[70%]" /> : <RouteMark className="size-[70%]" />}
    </span>
  );
}
