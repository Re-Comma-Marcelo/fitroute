/**
 * What an exercise holds for today, read from the active session: the first
 * working set's target next to what was done last time. Shown on the opening
 * briefing and on the card that introduces each exercise. Pure.
 */
import { stripReferenceNotes } from "./data/folders";
import { isSerieValida } from "./progression";
import type { ActiveExercise } from "./session-state";

export interface ExercisePreview {
  /** Working sets planned for today (warm-up not counted). */
  sets: number;
  /** Target of the first working set; null for bodyweight or an empty field. */
  todayKg: number | null;
  todayReps: number | null;
  repsMin: number;
  repsMax: number;
  /** First working set of the last session of this exercise; null the first time. */
  lastKg: number | null;
  lastReps: number | null;
  /** Heaviest weight ever logged (null = no record yet). */
  prKg: number | null;
  /** Today's target is heavier than last time. */
  up: boolean;
  /** One line worth reading before starting: routine note, else the coach's target line. */
  tip: string | null;
}

export function exercisePreview(ex: ActiveExercise): ExercisePreview {
  const work = ex.sets.filter(isSerieValida);
  const first = work.find((s) => !s.concluida) ?? work[0];
  const todayKg = first ? Number(first.pesoKg) || first.sugPeso || null : null;
  const todayReps = first ? Number(first.reps) || first.sugReps || null : null;
  const lastKg = first?.antPeso || null;
  const lastReps = first?.antReps || null;
  const notes = stripReferenceNotes(ex.notas);
  const tip =
    notes || (ex.sugestao?.aumentou ? ex.sugestao.motivo : "") || ex.prescricao?.line || null;
  return {
    sets: work.length,
    todayKg,
    todayReps,
    repsMin: ex.repsMin,
    repsMax: ex.repsMax,
    lastKg,
    lastReps,
    prKg: ex.prKg || null,
    up: todayKg !== null && lastKg !== null && todayKg > lastKg,
    tip,
  };
}
