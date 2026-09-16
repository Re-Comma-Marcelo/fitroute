import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { getExercises } from "@/lib/data/exercises";
import { getExerciseHistory, getWorkouts } from "@/lib/data/workouts";
import { exerciseLoopUrl } from "@/lib/exerciseMedia";
import { formatDateLong } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { toDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";
import type { WorkoutSet } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LOGO_PATH_INNER, LOGO_PATH_OUTER, LOGO_VIEWBOX } from "./logo-paths";
import type { MorphTarget } from "./ExerciseCompleteMorph";

const GROW_DURATION = 0.5;
const FLIP_HOLD_MS = 150;
const FLIP_DURATION = 0.5;
const SWIPE_THRESHOLD = 60;

export interface CardRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Panel = "default" | "info" | "history";

/**
 * Phase 3: the logo grows into a card, flips to reveal its purple back, then
 * flips again to fill the front with the next exercise. A programmed swipe
 * (not a drag-follow) switches between the default face, exercise info +
 * loop, and the last time this exercise was done. Any tap ends the sequence.
 */
export function ExerciseCard({
  target,
  cardRect,
  exerciseId,
  exerciseName,
  onDismiss,
}: {
  target: MorphTarget;
  cardRect: CardRect;
  exerciseId: string;
  exerciseName: string;
  onDismiss: () => void;
}) {
  const t = useT();
  const { unit } = useWeightUnit();
  const [flipped, setFlipped] = useState(false);
  const [panel, setPanel] = useState<Panel>("default");

  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const exercise = exercisesQuery.data?.find((e) => e.id === exerciseId);
  const loop = exercise ? exerciseLoopUrl(exercise) : null;

  const historyQuery = useQuery({
    queryKey: ["exercise-history", exerciseId],
    queryFn: () => getExerciseHistory(exerciseId),
  });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const lastSession = useMemo(() => {
    const dates = new Map((workoutsQuery.data ?? []).map((w) => [w.id, w.iniciadoEm]));
    const byWorkout = new Map<string, WorkoutSet[]>();
    for (const set of historyQuery.data ?? []) {
      const list = byWorkout.get(set.workoutId) ?? [];
      list.push(set);
      byWorkout.set(set.workoutId, list);
    }
    const [latest] =
      [...byWorkout.entries()].sort((a, b) =>
        (dates.get(b[0]) ?? "").localeCompare(dates.get(a[0]) ?? ""),
      ) ?? [];
    if (!latest) return null;
    return {
      date: dates.get(latest[0]) ?? null,
      sets: latest[1].slice().sort((a, b) => a.serieNum - b.serieNum),
    };
  }, [historyQuery.data, workoutsQuery.data]);

  /** Stable per-row organic offset — a route, not a grid. */
  const rowOffsets = useMemo(
    () => (lastSession?.sets ?? []).map(() => Math.round((Math.random() - 0.5) * 28)),
    [lastSession],
  );

  function handlePanEnd(_event: unknown, info: PanInfo) {
    const { x } = info.offset;
    if (panel !== "default") {
      setPanel("default");
      return;
    }
    if (x <= -SWIPE_THRESHOLD) setPanel("history");
    else if (x >= SWIPE_THRESHOLD) setPanel("info");
  }

  return (
    <motion.div
      className="fixed"
      style={{ perspective: 1600 }}
      initial={{
        left: target.left,
        top: target.top,
        width: target.size,
        height: target.size,
      }}
      animate={{
        left: cardRect.left,
        top: cardRect.top,
        width: cardRect.width,
        height: cardRect.height,
      }}
      transition={{ duration: GROW_DURATION, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        window.setTimeout(() => setFlipped(true), FLIP_HOLD_MS);
      }}
    >
      <motion.div
        className="relative size-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: FLIP_DURATION, ease: [0.45, 0, 0.2, 1] }}
      >
        {/* Back: purple, the route mark settled inside a card silhouette. */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-3xl bg-primary"
          style={{ backfaceVisibility: "hidden" }}
        >
          <svg viewBox={LOGO_VIEWBOX} className="size-[38%] text-primary-foreground">
            <path d={LOGO_PATH_OUTER} fill="currentColor" />
            <path d={LOGO_PATH_INNER} fill="currentColor" />
          </svg>
        </div>

        {/* Front: next exercise, swipeable for detail; a plain tap ends the sequence. */}
        <motion.div
          className="absolute inset-0 touch-none select-none overflow-hidden rounded-3xl border border-border bg-card"
          style={{ backfaceVisibility: "hidden", rotateY: 180 }}
          onPanEnd={handlePanEnd}
          onTap={onDismiss}
        >
          <AnimatePresence mode="wait" initial={false}>
            {panel === "default" ? (
              <motion.div
                key="default"
                className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Next exercise")}
                </span>
                <span className="text-2xl font-bold">{exerciseName}</span>
              </motion.div>
            ) : panel === "info" ? (
              <motion.div
                key="info"
                className="flex h-full flex-col gap-3 overflow-y-auto p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="text-lg font-bold">{exerciseName}</span>
                {loop ? (
                  <div className="aspect-[3/2] w-full overflow-hidden rounded-2xl bg-surface-3">
                    <img
                      src={loop}
                      alt={t("How to perform {name}", { name: exerciseName })}
                      loading="eager"
                      className="size-full object-contain"
                    />
                  </div>
                ) : null}
                {exercise?.instrucoes ? (
                  <p className="text-sm text-muted-foreground">{exercise.instrucoes}</p>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="history"
                className="flex h-full flex-col gap-3 overflow-y-auto p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="text-lg font-bold">{exerciseName}</span>
                <span className="text-xs text-muted-foreground">
                  {lastSession?.date
                    ? formatDateLong(lastSession.date)
                    : t("No history for this exercise yet — today is the baseline.")}
                </span>
                <ul className="mt-1 space-y-2">
                  {(lastSession?.sets ?? []).map((set, i) => (
                    <motion.li
                      key={set.id}
                      initial={{ opacity: 0, x: (rowOffsets[i] ?? 0) - 8 }}
                      animate={{ opacity: 1, x: rowOffsets[i] ?? 0 }}
                      transition={{ duration: 0.35, delay: 0.08 * i }}
                      className={cn("text-sm tabular-nums")}
                    >
                      <span className="text-muted-foreground">
                        {t("Set {label}", { label: String(set.serieNum) })}
                      </span>{" "}
                      {toDisplayWeight(set.pesoKg, unit)} {unit} × {set.reps}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
