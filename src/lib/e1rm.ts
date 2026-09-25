import type { WorkoutSet } from "./types";
import { isSerieDeCarga } from "./progression";

/**
 * Estimated one-rep max. Pure helper: 80kg x 5 and 85kg x 3 are both "the
 * same lift" in volume terms, but e1RM shows which one is actually stronger.
 *
 * Picks the formula research shows is more accurate for the rep count that
 * was actually performed: Epley for very low reps (it's the more-cited,
 * more-accurate formula for 1-4 reps / near-max singles-doubles), Brzycki
 * for 5+ reps (more accurate in the 5-10 range most hypertrophy work sits
 * in, and degrades more gracefully than Epley's linear growth beyond that).
 * Both lose real accuracy past ~10 reps — treat estimates that high as rough.
 */
export function e1rm(pesoKg: number, reps: number): number {
  if (pesoKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(pesoKg * 10) / 10;
  return reps <= 4 ? epley(pesoKg, reps) : brzycki(pesoKg, reps);
}

function epley(pesoKg: number, reps: number): number {
  return Math.round(pesoKg * (1 + reps / 30) * 10) / 10;
}

/** Undefined at 37 reps and unstable near it — cap so it never divides by ~0. */
function brzycki(pesoKg: number, reps: number): number {
  const capped = Math.min(reps, 36);
  return Math.round(pesoKg * (36 / (37 - capped)) * 10) / 10;
}

/**
 * Inverse of `e1rm`: the fraction of a 1RM that lines up with a target rep
 * count, using the matching inverted formula (same reps<=4 cutover).
 */
export function pctOfE1rmForReps(reps: number): number {
  if (reps <= 4) return 1 / (1 + reps / 30); // Epley inverted
  const capped = Math.min(reps, 36);
  return (37 - capped) / 36; // Brzycki inverted
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
