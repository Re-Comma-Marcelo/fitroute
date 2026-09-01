import type { WorkoutSet } from "./types";
import { isSerieDeCarga } from "./progression";

/**
 * Estimated one-rep max (Epley). Pure helper: 80kg x 5 and 85kg x 3 are both
 * "the same lift" in volume terms, but e1RM shows which one is actually stronger.
 */
export function e1rm(pesoKg: number, reps: number): number {
  if (pesoKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(pesoKg * 10) / 10;
  return Math.round(pesoKg * (1 + reps / 30) * 10) / 10;
}

export function setE1rm(set: Pick<WorkoutSet, "pesoKg" | "reps" | "tipoSerie">): number {
  if (!isSerieDeCarga(set)) return 0;
  return e1rm(set.pesoKg, set.reps);
}

/** Best estimated 1RM across the completed history of one exercise. */
export function bestE1rm(exerciseId: string, sets: WorkoutSet[]): number {
  return sets.reduce(
    (max, s) => (s.exerciseId === exerciseId && s.concluida ? Math.max(max, setE1rm(s)) : max),
    0,
  );
}
