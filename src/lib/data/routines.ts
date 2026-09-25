import { fetchRoutines, persistRoutine, removeRoutine } from "../forja.functions";
import type { Routine, RoutineExercise, SwapReason } from "../types";
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
  // Keep fields the caller did not send (folder, role): the server kept them too.
  if (idx >= 0) list[idx] = { ...list[idx]!, ...saved };
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

/** Drop the cache so the next read reflects server-side moves (folder switches). */
export function refreshRoutines(): void {
  cache = null;
  inflight = null;
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

/** The routine's exercises with today's swaps (original id -> replacement) applied in place. */
function withSwaps(routine: Routine, swaps: Record<string, string>): RoutineExercise[] {
  return routine.exercicios.map((ex) =>
    swaps[ex.exerciseId] ? { ...ex, exerciseId: swaps[ex.exerciseId]! } : ex,
  );
}

/** Make today's swaps the routine's standard from now on. */
export async function applySwapsToRoutine(
  routineId: string,
  swaps: Record<string, string>,
): Promise<Routine | null> {
  const routine = await getRoutine(routineId);
  if (!routine) return null;
  return saveRoutine({ ...routine, exercicios: withSwaps(routine, swaps) });
}

/**
 * Keep today's swaps as a variation of the routine, filed in the same folder.
 * Variations are never scheduled: the standard routine keeps its weekdays.
 */
export async function saveSwapVariation(
  routineId: string,
  swaps: Record<string, string>,
  nome: string,
  motivo?: SwapReason,
): Promise<Routine | null> {
  const routine = await getRoutine(routineId);
  if (!routine) return null;
  return saveRoutine({
    ...routine,
    id: `rot_${Math.random().toString(36).slice(2, 10)}`,
    nome,
    diasSemana: [],
    papel: "variacao",
    variacaoDe: routine.variacaoDe ?? routine.id,
    ...(motivo ? { motivo } : {}),
    exercicios: withSwaps(routine, swaps).map((ex) => ({
      ...ex,
      id: `rex_${Math.random().toString(36).slice(2, 10)}`,
    })),
  });
}

/**
 * Make a variation the standard: it takes over the weekdays, and the routine
 * it came from steps back to a variation of it.
 */
export async function promoteVariation(id: string): Promise<Routine | null> {
  const variation = await getRoutine(id);
  if (!variation) return null;
  const parent = variation.variacaoDe ? await getRoutine(variation.variacaoDe) : null;
  const promoted = await saveRoutine({
    ...variation,
    papel: "padrao",
    variacaoDe: null,
    motivo: null,
    diasSemana: parent?.diasSemana?.length ? parent.diasSemana : (variation.diasSemana ?? []),
  });
  if (parent) {
    await saveRoutine({ ...parent, papel: "variacao", variacaoDe: promoted.id, diasSemana: [] });
  }
  return promoted;
}

/** Copy routines (new ids) into another folder, keeping their roles and links. */
export async function copyRoutinesToFolder(
  routines: Routine[],
  folderId: string,
): Promise<Routine[]> {
  const newId = new Map(
    routines.map((r) => [r.id, `rot_${Math.random().toString(36).slice(2, 10)}`]),
  );
  const saved: Routine[] = [];
  for (const r of routines) {
    saved.push(
      await saveRoutine({
        ...r,
        id: newId.get(r.id)!,
        folderId,
        // A variation follows its standard into the new folder when both are copied.
        variacaoDe: r.variacaoDe ? (newId.get(r.variacaoDe) ?? null) : null,
        exercicios: r.exercicios.map((ex) => ({
          ...ex,
          id: `rex_${Math.random().toString(36).slice(2, 10)}`,
        })),
      }),
    );
  }
  return saved;
}
