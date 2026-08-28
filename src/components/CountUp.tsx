import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Conta de 0 até `value` em ~600ms com ease-out. Respeita prefers-reduced-motion. */
export function useCountUp(value: number, durationMs = 600) {
  const [display, setDisplay] = useState(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return display;
}

export function CountUp({
  value,
  decimals = 0,
  format,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  decimals?: number;
  format?: (n: number) => string;
  className?: string;
  /** Screen readers get the final value, not the animated frames. */
  "aria-label"?: string;
}) {
  const current = useCountUp(value);
  const text = format ? format(current) : current.toFixed(decimals);
  return (
    <span
      className={className}
      {...(ariaLabel ? { "aria-label": ariaLabel, role: "text" } : {})}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {text}
    </span>
  );
}
