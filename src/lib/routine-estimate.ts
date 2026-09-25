import type { Routine } from "@/lib/types";

/**
 * Seconds spent actually performing one set (rough average across lifts).
 * Exported so every duration estimate in the app (session-length fit checks
 * included, see coach/today-card.ts) uses the same figure instead of each
 * guessing its own.
 */
export const WORK_SECONDS_PER_SET = 40;

/** Rough duration of a routine: work time plus programmed rest between sets. */
export function estimateRoutineMinutes(routine: Routine): number {
  const seconds = routine.exercicios.reduce((total, re) => {
    const sets = Math.max(1, re.seriesAlvo);
    return total + sets * WORK_SECONDS_PER_SET + Math.max(0, sets - 1) * (re.descansoSeg || 90);
  }, 0);
  // Add a small transition allowance per exercise (walking, setup).
  const transitions = routine.exercicios.length * 45;
  return Math.max(1, Math.round((seconds + transitions) / 60));
}
