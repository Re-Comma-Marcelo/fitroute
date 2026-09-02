import { setE1rm } from "./e1rm";
import { isSerieDeCarga } from "./progression";
import type { Workout, WorkoutSet } from "./types";

export interface PersonalRecord {
  exerciseId: string;
  /** Heaviest completed load and the reps done with it. */
  bestWeight: number;
  bestWeightReps: number;
  /** Best estimated 1RM across the whole history of the lift. */
  bestE1rm: number;
  /** Date of the session that produced the best e1RM. */
  date: string;
}

/**
 * One record row per exercise with logged load, newest record first.
 * Pure read over the sets already loaded by the Progress screen.
 */
export function personalRecords(sets: WorkoutSet[], workouts: Workout[]): PersonalRecord[] {
  const dateOf = new Map<string, string>();
  for (const w of workouts) dateOf.set(w.id, w.iniciadoEm);

  const rows = new Map<string, PersonalRecord>();
  for (const s of sets) {
    if (!s.concluida || !isSerieDeCarga(s) || s.pesoKg <= 0 || s.reps <= 0) continue;
    const row =
      rows.get(s.exerciseId) ??
      ({
        exerciseId: s.exerciseId,
        bestWeight: 0,
        bestWeightReps: 0,
        bestE1rm: 0,
        date: dateOf.get(s.workoutId) ?? "",
      } satisfies PersonalRecord);

    if (s.pesoKg > row.bestWeight) {
      row.bestWeight = s.pesoKg;
      row.bestWeightReps = s.reps;
    }
    const estimate = setE1rm(s);
    if (estimate > row.bestE1rm) {
      row.bestE1rm = estimate;
      row.date = dateOf.get(s.workoutId) ?? row.date;
    }
    rows.set(s.exerciseId, row);
  }

  return [...rows.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export interface LiftPoint {
  date: string;
  e1rm: number;
}

/** Best e1RM per session for one exercise, oldest first — chart input. */
export function e1rmSeries(
  exerciseId: string,
  sets: WorkoutSet[],
  workouts: Workout[],
): LiftPoint[] {
  const dateOf = new Map<string, string>();
  for (const w of workouts) dateOf.set(w.id, w.iniciadoEm);

  const best = new Map<string, number>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || !s.concluida) continue;
    const date = dateOf.get(s.workoutId);
    if (!date) continue;
    const estimate = setE1rm(s);
    if (estimate <= 0) continue;
    best.set(date, Math.max(best.get(date) ?? 0, estimate));
  }

  return [...best.entries()]
    .map(([date, e1rm]) => ({ date, e1rm }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
