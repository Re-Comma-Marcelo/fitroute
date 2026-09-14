import { useId } from "react";

import { cn } from "@/lib/utils";

/** Mark geometry, drawn once here so every surface uses the same source. */
const BOWL = "M22 22H82a24 24 0 0 1 0 48H62";
const LEG = "M62 70 96 108";
/** The echo sits a stroke below the mark, scaled down and left-aligned with it. */
const ECHO = "translate(1.84 14.5) scale(0.885)";

/**
 * The Route mark: an "R" drawn as a single path with a trailing echo, the way
 * a route leaves a trace behind it. The echo uses `currentColor`, so it reads
 * as a soft ghost on dark and light surfaces alike.
 */
export function RouteLogo({
  className,
  withEcho = true,
  title,
}: {
  className?: string;
  /** The echo turns muddy below ~28px — drop it when the mark is smaller than that. */
  withEcho?: boolean;
  /** Leave unset for decorative use next to the wordmark. */
  title?: string;
}) {
  const gradientId = useId();

  const strokes = (stroke: string) => (
    <>
      <path
        d={BOWL}
        fill="none"
        stroke={stroke}
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={LEG} fill="none" stroke={stroke} strokeWidth={12} strokeLinecap="butt" />
    </>
  );

  return (
    <svg
      viewBox="0 0 128 128"
      className={cn("size-8", className)}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient
          id={gradientId}
          x1="18"
          y1="16"
          x2="106"
          y2="112"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#6E3BF7" />
          <stop offset="1" stopColor="#8F6BFF" />
        </linearGradient>
      </defs>
      {withEcho ? (
        <g transform={ECHO} opacity={0.1}>
          {strokes("currentColor")}
        </g>
      ) : null}
      {strokes(`url(#${gradientId})`)}
    </svg>
  );
}

/**
 * Mark on the dark app tile — the same artwork shipped as the home-screen icon,
 * for the few places that need the logo to read as the installed app.
 */
export function RouteLogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-b from-surface-2 to-background",
        className,
      )}
    >
      <RouteLogo className="size-[64%]" />
    </span>
  );
}
