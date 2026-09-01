import { isSerieValida } from "@/lib/progression";
import type { Workout, WorkoutSet } from "@/lib/types";

export interface ExerciseDiff {
  exerciseId: string;
  volume: number;
  volumePrev: number;
  bestWeight: number;
  bestWeightPrev: number;
  reps: number;
  repsPrev: number;
}

export interface SessionDiff {
  previous: Workout;
  volumeDelta: number;
  exercises: ExerciseDiff[];
}

interface Totals {
  volume: number;
  bestWeight: number;
  reps: number;
}

function totalsByExercise(sets: WorkoutSet[]): Map<string, Totals> {
  const map = new Map<string, Totals>();
  for (const s of sets) {
    if (!isSerieValida(s) || !s.concluida) continue;
    const entry = map.get(s.exerciseId) ?? { volume: 0, bestWeight: 0, reps: 0 };
    entry.volume += s.pesoKg * s.reps;
    entry.bestWeight = Math.max(entry.bestWeight, s.pesoKg);
    entry.reps += s.reps;
    map.set(s.exerciseId, entry);
  }
  return map;
}

/**
 * Compare a session with the previous run of the same routine.
 * Returns null when there is no earlier session of that routine.
 */
export function compareWithPreviousRun(
  workout: Workout,
  sets: WorkoutSet[],
  allWorkouts: Workout[],
  allSets: WorkoutSet[],
): SessionDiff | null {
  if (!workout.routineId) return null;
  const previous = allWorkouts
    .filter(
      (w) =>
        w.routineId === workout.routineId &&
        w.id !== workout.id &&
        w.iniciadoEm < workout.iniciadoEm,
    )
    .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm))[0];
  if (!previous) return null;

  const current = totalsByExercise(sets);
  const before = totalsByExercise(allSets.filter((s) => s.workoutId === previous.id));

  const exercises: ExerciseDiff[] = [...current.entries()].map(([exerciseId, now]) => {
    const prev = before.get(exerciseId) ?? { volume: 0, bestWeight: 0, reps: 0 };
    return {
      exerciseId,
      volume: Math.round(now.volume),
      volumePrev: Math.round(prev.volume),
      bestWeight: now.bestWeight,
      bestWeightPrev: prev.bestWeight,
      reps: now.reps,
      repsPrev: prev.reps,
    };
  });

  return {
    previous,
    volumeDelta: Math.round(workout.volumeTotalKg - previous.volumeTotalKg),
    exercises,
  };
}
