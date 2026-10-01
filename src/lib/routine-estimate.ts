import { isSerieValida } from "@/lib/progression";
import type { ActiveSession } from "@/lib/session-state";
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

/** Same estimate for a session in progress: its actual sets (warm-up included) and rests. */
export function estimateSessionMinutes(session: ActiveSession): number {
  const exercicios = session.exercicios.filter((ex) => !ex.pulado);
  const seconds = exercicios.reduce((total, ex) => {
    const sets = Math.max(1, ex.sets.length);
    const warmups = ex.sets.filter((s) => !isSerieValida(s)).length;
    // Warm-up sets are short and barely rested: count them as half.
    const rests = Math.max(0, sets - 1 - warmups) * (ex.descansoSeg || 90);
    return total + (sets - warmups / 2) * WORK_SECONDS_PER_SET + rests;
  }, 0);
  const transitions = exercicios.length * 45;
  return Math.max(1, Math.round((seconds + transitions) / 60));
}
