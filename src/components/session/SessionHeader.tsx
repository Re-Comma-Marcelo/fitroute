import { ChevronDown, ListOrdered, MoreHorizontal } from "lucide-react";
import { formatDuration, formatKg } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type SegmentStatus = "done" | "current" | "pending" | "skipped";

/**
 * One thin header: where you are in the workout (segments), how long it has
 * been running, the load moved so far, and the exercise you are on. Every
 * secondary control opens a sheet instead of living here.
 */
export function SessionHeader({
  routineName,
  elapsed,
  paused,
  volumeKg,
  volumeBurst,
  segments,
  exerciseIdx,
  exerciseName,
  blockLabel,
  onCollapse,
  onOpenSession,
  onOpenMenu,
  onJump,
  coach,
}: {
  routineName: string;
  elapsed: number;
  paused: boolean;
  volumeKg: number;
  volumeBurst: { key: number; kg: number } | null;
  segments: SegmentStatus[];
  exerciseIdx: number;
  exerciseName: string;
  blockLabel?: string | undefined;
  onCollapse: () => void;
  onOpenSession: () => void;
  onOpenMenu: () => void;
  onJump: (idx: number) => void;
  /** Coach entry point, rendered as-is (its own trigger + sheet). */
  coach?: React.ReactNode;
}) {
  const t = useT();
  const total = segments.filter((s) => s !== "skipped").length;
  const position = segments.slice(0, exerciseIdx + 1).filter((s) => s !== "skipped").length;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="mx-auto max-w-md px-2 pt-1">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onCollapse}
            aria-label={t("Collapse session")}
            className="tap-target grid size-11 place-items-center rounded-full text-muted-foreground"
          >
            <ChevronDown className="size-6" />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
            {routineName}
          </p>
          <div className="relative mr-1 flex shrink-0 items-baseline gap-1.5 font-mono text-xs font-semibold tabular-nums">
            <span className={cn(paused ? "text-muted-foreground line-through" : "text-foreground")}>
              {formatDuration(elapsed)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-train">{formatKg(Math.round(volumeKg))}</span>
            {volumeBurst ? (
              <span
                key={volumeBurst.key}
                aria-hidden="true"
                className="volume-burst pointer-events-none absolute right-0 top-0 rounded-full bg-train px-2 py-0.5 text-xs font-bold tabular-nums text-background"
              >
                +{formatKg(Math.round(volumeBurst.kg))}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onOpenSession}
            aria-label={t("All exercises")}
            className="tap-target grid size-11 place-items-center rounded-full text-muted-foreground"
          >
            <ListOrdered className="size-5" />
          </button>
          {coach}
        </div>

        <div
          className="flex gap-1 px-2 pb-2 pt-0.5"
          role="img"
          aria-label={t("Exercise {position} of {total}", { position, total })}
        >
          {segments.map((status, idx) => (
            <button
              key={idx}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => onJump(idx)}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                status === "done" && "bg-success",
                status === "current" && "bg-primary",
                status === "pending" && "bg-surface-3",
                status === "skipped" && "bg-surface-3 opacity-40",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 px-2 pb-2.5">
          <div className="min-w-0 flex-1">
            <p className="label-caps text-primary">
              {t("Exercise {position} of {total}", { position, total })}
            </p>
            <p className="flex items-center gap-2 font-display text-lg font-semibold leading-tight">
              {blockLabel ? (
                <span className="shrink-0 rounded-md bg-train/15 px-1.5 py-0.5 text-[11px] font-bold text-train">
                  {blockLabel}
                </span>
              ) : null}
              <span className="min-w-0 truncate">{exerciseName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label={t("Exercise options")}
            className="tap-target grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-foreground"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
