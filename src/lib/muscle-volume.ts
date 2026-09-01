import { weekStart } from "@/lib/coach/signals";
import { isSerieValida } from "@/lib/progression";
import type { Exercise, Workout, WorkoutSet } from "@/lib/types";

export interface MuscleVolumeRow {
  grupo: string;
  current: number;
  previous: number;
  sets: number;
}

/**
 * Volume per primary muscle group for the current week and the one before it,
 * so the Progress screen can show where the load actually went.
 */
export function muscleVolumeComparison(
  workouts: Workout[],
  sets: WorkoutSet[],
  exercises: Pick<Exercise, "id" | "grupoPrimario">[],
  now = new Date(),
): MuscleVolumeRow[] {
  const thisWeek = weekStart(now);
  const prevDate = new Date(now);
  prevDate.setDate(prevDate.getDate() - 7);
  const lastWeek = weekStart(prevDate);

  const workoutWeek = new Map<string, string>();
  for (const w of workouts) workoutWeek.set(w.id, weekStart(new Date(w.iniciadoEm)));

  const groupOf = new Map<string, string>();
  for (const e of exercises) groupOf.set(e.id, e.grupoPrimario);

  const rows = new Map<string, MuscleVolumeRow>();
  for (const s of sets) {
    if (!s.concluida || !isSerieValida(s)) continue;
    const week = workoutWeek.get(s.workoutId);
    if (week !== thisWeek && week !== lastWeek) continue;
    const grupo = groupOf.get(s.exerciseId);
    if (!grupo) continue;
    const row = rows.get(grupo) ?? { grupo, current: 0, previous: 0, sets: 0 };
    const volume = s.pesoKg * s.reps;
    if (week === thisWeek) {
      row.current += volume;
      row.sets += 1;
    } else {
      row.previous += volume;
    }
    rows.set(grupo, row);
  }

  return [...rows.values()]
    .map((r) => ({ ...r, current: Math.round(r.current), previous: Math.round(r.previous) }))
    .sort((a, b) => b.current - a.current || b.previous - a.previous);
}

/** Total time under tension (seconds) logged in timed sets. */
export function timeUnderTension(sets: WorkoutSet[]): number {
  return sets
    .filter((s) => s.tipoSerie === "tempo" && s.concluida)
    .reduce((total, s) => total + s.reps, 0);
}
