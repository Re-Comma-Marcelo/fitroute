import { delay, uid, workoutSets, workouts } from "./mocks";
import type { Workout, WorkoutSet } from "../types";

export async function getWorkouts(): Promise<Workout[]> {
  return delay(
    [...workouts]
      .filter((w) => w.finalizadoEm)
      .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm)),
  );
}

export async function getWorkout(id: string): Promise<Workout | null> {
  return delay(workouts.find((w) => w.id === id) ?? null);
}

export async function getWorkoutSets(workoutId: string): Promise<WorkoutSet[]> {
  return delay(
    workoutSets
      .filter((s) => s.workoutId === workoutId)
      .sort((a, b) => a.ordemExercicio - b.ordemExercicio || a.serieNum - b.serieNum),
  );
}

/** Histórico de séries de um exercício, do mais antigo ao mais recente. */
export async function getExerciseHistory(exerciseId: string): Promise<WorkoutSet[]> {
  const order = new Map(workouts.map((w) => [w.id, w.iniciadoEm]));
  return delay(
    workoutSets
      .filter((s) => s.exerciseId === exerciseId && s.concluida)
      .sort(
        (a, b) =>
          (order.get(a.workoutId) ?? "").localeCompare(order.get(b.workoutId) ?? "") ||
          a.serieNum - b.serieNum,
      ),
  );
}

/** Séries do treino anterior daquele exercício — base das sugestões. */
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
  const saved: Workout = { ...workout, id: workout.id || uid("w") };
  const idx = workouts.findIndex((w) => w.id === saved.id);
  if (idx >= 0) workouts[idx] = saved;
  else workouts.push(saved);

  for (let i = workoutSets.length - 1; i >= 0; i--) {
    if (workoutSets[i]!.workoutId === saved.id) workoutSets.splice(i, 1);
  }
  sets.forEach((s) => workoutSets.push({ ...s, workoutId: saved.id }));
  return delay(saved);
}

export async function deleteWorkout(id: string): Promise<void> {
  const idx = workouts.findIndex((w) => w.id === id);
  if (idx >= 0) workouts.splice(idx, 1);
  for (let i = workoutSets.length - 1; i >= 0; i--) {
    if (workoutSets[i]!.workoutId === id) workoutSets.splice(i, 1);
  }
  return delay(undefined);
}