import { fetchRoutines, persistRoutine, removeRoutine } from "../forja.functions";
import type { Routine, RoutineExercise } from "../types";
import { getWorkoutLog } from "./workouts";

let cache: Routine[] | null = null;
let inflight: Promise<Routine[]> | null = null;

async function all(): Promise<Routine[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetchRoutines().then((list) => {
      cache = list as Routine[];
      inflight = null;
      return cache;
    });
  }
  return inflight;
}

export async function getRoutines(): Promise<Routine[]> {
  return (await all()).map((r) => ({ ...r, exercicios: [...r.exercicios] }));
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const found = (await all()).find((r) => r.id === id);
  return found ? { ...found, exercicios: [...found.exercicios] } : null;
}

export async function getRoutineLastWorkoutDate(routineId: string): Promise<string | null> {
  const { workouts } = await getWorkoutLog();
  const done = workouts
    .filter((w) => w.routineId === routineId && w.finalizadoEm)
    .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm));
  return done[0]?.iniciadoEm ?? null;
}

export async function saveRoutine(routine: Routine): Promise<Routine> {
  const saved = (await persistRoutine({ data: { routine } })) as Routine;
  const list = [...(cache ?? [])];
  const idx = list.findIndex((r) => r.id === saved.id);
  if (idx >= 0) list[idx] = saved;
  else list.push(saved);
  cache = list;
  return saved;
}

/** Copy an existing routine (new ids, "{name} (copy)") so it can be tweaked freely. */
export async function duplicateRoutine(id: string, copyLabel: string): Promise<Routine | null> {
  const source = await getRoutine(id);
  if (!source) return null;
  const copy: Routine = {
    ...source,
    id: `rot_${Math.random().toString(36).slice(2, 10)}`,
    nome: copyLabel,
    exercicios: source.exercicios.map((ex) => ({
      ...ex,
      id: `rex_${Math.random().toString(36).slice(2, 10)}`,
    })),
  };
  return saveRoutine(copy);
}

export async function deleteRoutine(id: string): Promise<void> {
  await removeRoutine({ data: { id } });
  cache = (cache ?? []).filter((r) => r.id !== id);
}

export function newRoutineExercise(exerciseId: string, ordem: number): RoutineExercise {
  return {
    id: `rex_${Math.random().toString(36).slice(2, 10)}`,
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
  const { workouts, sets } = await getWorkoutLog();
  const ids = new Set(workouts.filter((w) => w.routineId === routineId).map((w) => w.id));
  return sets.filter((s) => ids.has(s.workoutId)).length;
}
