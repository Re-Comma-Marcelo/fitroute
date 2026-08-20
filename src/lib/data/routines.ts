import { delay, routines, uid, workoutSets, workouts } from "./mocks";
import type { Routine, RoutineExercise } from "../types";

export async function getRoutines(): Promise<Routine[]> {
  return delay(routines.map((r) => ({ ...r, exercicios: [...r.exercicios] })));
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const found = routines.find((r) => r.id === id);
  return delay(found ? { ...found, exercicios: [...found.exercicios] } : null);
}

export async function getRoutineLastWorkoutDate(routineId: string): Promise<string | null> {
  const done = workouts
    .filter((w) => w.routineId === routineId && w.finalizadoEm)
    .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm));
  return delay(done[0]?.iniciadoEm ?? null);
}

export async function saveRoutine(routine: Routine): Promise<Routine> {
  const normalized: Routine = {
    ...routine,
    id: routine.id || uid("r"),
    exercicios: routine.exercicios.map((e, i) => ({ ...e, ordem: i })),
  };
  const idx = routines.findIndex((r) => r.id === normalized.id);
  if (idx >= 0) routines[idx] = normalized;
  else routines.push(normalized);
  return delay(normalized);
}

export async function deleteRoutine(id: string): Promise<void> {
  const idx = routines.findIndex((r) => r.id === id);
  if (idx >= 0) routines.splice(idx, 1);
  return delay(undefined);
}

export function newRoutineExercise(exerciseId: string, ordem: number): RoutineExercise {
  return {
    id: uid("rex"),
    exerciseId,
    ordem,
    seriesAlvo: 3,
    repsMin: 8,
    repsMax: 12,
    descansoSeg: 90,
    notas: "",
  };
}

export async function countRoutineSetsLogged(routineId: string): Promise<number> {
  const ids = workouts.filter((w) => w.routineId === routineId).map((w) => w.id);
  return delay(workoutSets.filter((s) => ids.includes(s.workoutId)).length);
}