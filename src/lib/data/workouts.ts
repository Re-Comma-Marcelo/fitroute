import { fetchWorkoutLog, persistWorkout, removeWorkout } from "../forja.functions";
import type { Workout, WorkoutSet } from "../types";

interface Log {
  workouts: Workout[];
  sets: WorkoutSet[];
}

let cache: Log | null = null;
let inflight: Promise<Log> | null = null;

export async function getWorkoutLog(): Promise<Log> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetchWorkoutLog().then(
      (log) => {
        cache = log as Log;
        inflight = null;
        return cache;
      },
      (error: unknown) => {
        // Don't keep a failed request around: the next call (e.g. "Try again") refetches.
        inflight = null;
        throw error;
      },
    );
  }
  return inflight;
}

function invalidate() {
  cache = null;
  inflight = null;
}

export async function getWorkouts(): Promise<Workout[]> {
  const { workouts } = await getWorkoutLog();
  return workouts
    .filter((w) => w.finalizadoEm)
    .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm));
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const { workouts } = await getWorkoutLog();
  return workouts.find((w) => w.id === id) ?? null;
}

export async function getWorkoutSets(workoutId: string): Promise<WorkoutSet[]> {
  const { sets } = await getWorkoutLog();
  return sets
    .filter((s) => s.workoutId === workoutId)
    .sort((a, b) => a.ordemExercicio - b.ordemExercicio || a.serieNum - b.serieNum);
}

/** Set history for one exercise, oldest to newest. */
export async function getExerciseHistory(exerciseId: string): Promise<WorkoutSet[]> {
  const { workouts, sets } = await getWorkoutLog();
  const order = new Map(workouts.map((w) => [w.id, w.iniciadoEm]));
  return sets
    .filter((s) => s.exerciseId === exerciseId && s.concluida)
    .sort(
      (a, b) =>
        (order.get(a.workoutId) ?? "").localeCompare(order.get(b.workoutId) ?? "") ||
        a.serieNum - b.serieNum,
    );
}

/** Sets from the previous session of that exercise — basis for suggestions. */
export async function getLastSetsForExercise(exerciseId: string): Promise<WorkoutSet[]> {
  const history = await getExerciseHistory(exerciseId);
  const last = history[history.length - 1];
  if (!last) return [];
  return history.filter((s) => s.workoutId === last.workoutId);
}

export async function getPersonalRecord(exerciseId: string): Promise<number> {
  const history = await getExerciseHistory(exerciseId);
  return history.reduce((max, s) => Math.max(max, s.pesoKg), 0);
}

export async function saveWorkout(workout: Workout, sets: WorkoutSet[] = []): Promise<Workout> {
  const saved = (await persistWorkout({ data: { workout, sets } })) as Workout;
  invalidate();
  return saved;
}

export async function deleteWorkout(id: string): Promise<void> {
  await removeWorkout({ data: { id } });
  invalidate();
}
