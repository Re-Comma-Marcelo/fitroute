import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ChipTone = "up" | "warn" | "calm";

const TONE: Record<ChipTone, string> = {
  up: "bg-fj-accent-tint text-fj-accent border-[var(--accent-tint-border)]",
  warn: "bg-fj-effort-tint text-fj-effort-text border-[var(--effort-tint-border)]",
  calm: "bg-fj-neutral-tint text-fj-text-2 border-[var(--neutral-tint-border)]",
};

/**
 * Per-exercise coach status. up = increase, warn = stalling, calm = go easier.
 * Renders a button so a chip can open its details (pass onClick) — otherwise
 * it is inert.
 */
export const Chip = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { tone: ChipTone }
>(function Chip({ tone, className, type, ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "inline-flex h-7 max-w-full items-center gap-1 truncate rounded-button border px-2.5 text-meta font-medium",
        TONE[tone],
        className,
      )}
      {...props}
    />
  );
});
