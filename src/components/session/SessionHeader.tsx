import { Fragment, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ListOrdered, MoreHorizontal } from "lucide-react";
import { ExerciseThumb } from "@/components/ExerciseThumb";
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
  currentProgress,
  exerciseId,
  exerciseName,
  blockLabel,
  onCollapse,
  onOpenSession,
  onOpenMenu,
  coach,
}: {
  routineName: string;
  elapsed: number;
  paused: boolean;
  volumeKg: number;
  volumeBurst: { key: number; kg: number } | null;
  segments: SegmentStatus[];
  exerciseIdx: number;
  /** Share (0-1) of the current exercise's sets already done. */
  currentProgress: number;
  /** Catalog id of the current exercise, for its picture next to the name. */
  exerciseId?: string | undefined;
  exerciseName: string;
  blockLabel?: string | undefined;
  onCollapse: () => void;
  onOpenSession: () => void;
  onOpenMenu: () => void;
  /** Coach entry point, rendered as-is (its own trigger + sheet). */
  coach?: React.ReactNode;
}) {
  const t = useT();
  const total = segments.filter((s) => s !== "skipped").length;
  const position = segments.slice(0, exerciseIdx + 1).filter((s) => s !== "skipped").length;
  // Checkpoints only pop when they are reached now, not when a session resumes.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

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
          className="flex items-center px-2 pb-2 pt-0.5"
          role="img"
          aria-label={t("Exercise {position} of {total}", { position, total })}
        >
          {/* Progress only. It used to be a 4 px tall button that jumped exercises:
              a stray thumb on the sticky header silently left sets behind.
              One continuous route: two lines per exercise, like the Route mark —
              purple marks where you are, white follows one step behind as the
              sets get done — and a checkpoint closing each exercise. A skipped
              one stays on the route as a dotted detour, never a gap. */}
          {segments.map((status, idx) => {
            const purple = status === "done" || status === "current" ? 1 : 0;
            const white =
              status === "done" ? 1 : status === "current" ? clampUnit(currentProgress) : 0;
            const checkpoint: CheckpointState =
              status === "done" || (status === "current" && white >= 1)
                ? "done"
                : status === "current"
                  ? "next"
                  : status === "skipped"
                    ? "skipped"
                    : "pending";
            return (
              <Fragment key={idx}>
                {status === "skipped" ? (
                  <span className="flex h-2 flex-1 items-center text-muted-foreground/50">
                    <span
                      className="h-[3px] w-full"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle, currentColor 1px, transparent 1.2px)",
                        backgroundSize: "5px 3px",
                        backgroundPosition: "center",
                      }}
                    />
                  </span>
                ) : (
                  <span className="flex flex-1 flex-col gap-[2px]">
                    <SegmentLine fill={purple} className="bg-primary" />
                    <SegmentLine fill={white} className="bg-foreground" />
                  </span>
                )}
                <Checkpoint state={checkpoint} pop={mounted.current} />
              </Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-3 px-2 pb-2.5">
          {exerciseId ? (
            <ExerciseThumb round exerciseId={exerciseId} nome={exerciseName} className="size-11" />
          ) : null}
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

function clampUnit(n: number) {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

type CheckpointState = "done" | "next" | "pending" | "skipped";

/**
 * The stop that closes an exercise on the route. Done: both lines meet in a
 * white dot ringed in purple. Next: the purple ring you are walking to.
 * Pending: a ring on the muted track. Skipped: a smaller, quiet ring — passed
 * by, not failed.
 */
function Checkpoint({ state, pop }: { state: CheckpointState; pop: boolean }) {
  return (
    <motion.span
      key={state}
      aria-hidden="true"
      className={cn(
        "shrink-0 rounded-full",
        state === "done" && "size-2.5 border-2 border-primary bg-foreground",
        state === "next" && "size-2.5 border-2 border-primary bg-card",
        state === "pending" && "size-2.5 border-2 border-surface-3 bg-card",
        state === "skipped" && "mx-px size-2 border border-muted-foreground/50 bg-card",
      )}
      initial={pop && state === "done" ? { scale: 0.3 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 16 }}
    />
  );
}

/** One of the two lines of a segment: a muted track filled from the left, flush with its checkpoints. */
function SegmentLine({ fill, className }: { fill: number; className: string }) {
  return (
    <span className="relative h-[3px] overflow-hidden bg-surface-3">
      <span
        className={cn(
          "absolute inset-0 origin-left transition-transform duration-500 ease-out",
          className,
        )}
        style={{ transform: `scaleX(${fill})` }}
      />
    </span>
  );
}
