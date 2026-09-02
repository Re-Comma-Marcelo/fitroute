import { Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { useT } from "@/lib/i18n";

/**
 * Floating "island" for the rest countdown: circular progress + big tabular
 * timer + -15s / +15s / skip. Shared by the session screen and the mini-player
 * so the countdown looks and behaves the same everywhere.
 */
export function RestIsland({
  total,
  left,
  onAdd,
  onSubtract,
  onSkip,
  onOpenSettings,
  className,
}: {
  total: number;
  left: number;
  onAdd: () => void;
  onSubtract: () => void;
  onSkip: () => void;
  onOpenSettings?: () => void;
  className?: string;
}) {
  const t = useT();
  const pct = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const isLow = left <= 10;
  const size = 40;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div
      className={cn(
        "pointer-events-auto mx-auto flex max-w-md items-center gap-1.5 rounded-full border py-1.5 pl-2 pr-1.5 shadow-2xl backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
        isLow ? "border-warn/40 bg-warn/10" : "border-info/30 bg-card/95",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenSettings}
        disabled={!onOpenSettings}
        aria-label={t("Rest")}
        className="flex shrink-0 items-center gap-2 rounded-full pl-0.5 pr-1 disabled:cursor-default"
      >
        <span className="relative flex shrink-0 items-center justify-center">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              className="stroke-surface-3"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
              className={cn(
                "transition-[stroke-dashoffset] duration-1000 ease-linear",
                isLow ? "stroke-warn" : "stroke-info",
              )}
            />
          </svg>
          <Timer
            className={cn(
              "absolute size-4",
              isLow ? "text-warn motion-safe:animate-pulse" : "text-info",
            )}
          />
        </span>
        <span
          role="timer"
          aria-live="off"
          className={cn(
            "font-mono text-xl font-semibold tabular-nums leading-none",
            isLow ? "text-warn" : "text-info",
          )}
        >
          {formatDuration(left)}
        </span>
      </button>

      <span className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onSubtract}
          aria-label={t("Subtract 15 seconds")}
          className="tap-target flex h-11 min-w-11 items-center justify-center rounded-full bg-surface-3 px-3 text-xs font-semibold tabular-nums"
        >
          −15
        </button>
        <button
          type="button"
          onClick={onAdd}
          aria-label={t("Add 15 seconds")}
          className="tap-target flex h-11 min-w-11 items-center justify-center rounded-full bg-surface-3 px-3 text-xs font-semibold tabular-nums"
        >
          +15
        </button>
        <button
          type="button"
          onClick={onSkip}
          aria-label={t("Skip rest")}
          className="tap-target flex size-11 items-center justify-center rounded-full bg-info text-info-foreground"
        >
          <X className="size-5" />
        </button>
      </span>
    </div>
  );
}
