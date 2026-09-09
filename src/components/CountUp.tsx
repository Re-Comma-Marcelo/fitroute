import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
 if (typeof window === "undefined" || !window.matchMedia) return false;
 return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Conta de 0 até `value` em ~600ms com ease-[cubic-bezier(.2,0,.2,1)]. Respeita prefers-reduced-motion. */
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
 const finalText = format ? format(value) : value.toFixed(decimals);
 return (
 <>
 <span aria-hidden="true" className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
 {text}
 </span>
 {ariaLabel && <span className="sr-only">{ariaLabel}</span>}
 {!ariaLabel && <span className="sr-only">{finalText}</span>}
 </>
 );
}
