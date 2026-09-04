import { fetchExercises, persistExercise } from "../forja.functions";
import type { Exercise } from "../types";
import { exercises as builtInCatalog } from "./mocks";

let cache: Exercise[] | null = null;
let inflight: Promise<Exercise[]> | null = null;

/**
 * The built-in catalog ships with the app; the database only needs to hold what
 * the user added or edited. Stored rows win over the built-in copy of the same id.
 */
function mergeCatalog(stored: Exercise[]): Exercise[] {
  const byId = new Map<string, Exercise>();
  for (const e of builtInCatalog) byId.set(e.id, e);
  for (const e of stored) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

async function all(): Promise<Exercise[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetchExercises()
      .catch(() => [] as Exercise[])
      .then((list) => {
        cache = mergeCatalog(list as Exercise[]);
        inflight = null;
        return cache;
      });
  }
  return inflight;
}

export async function getExercises(): Promise<Exercise[]> {
  return [...(await all())];
}

export async function getExercise(id: string): Promise<Exercise | null> {
  return (await all()).find((e) => e.id === id) ?? null;
}

export async function getMuscleGroups(): Promise<string[]> {
  return [...new Set((await all()).map((e) => e.grupoPrimario))].sort();
}

export async function getEquipments(): Promise<string[]> {
  return [...new Set((await all()).map((e) => e.equipamento))].sort();
}

export async function createExercise(input: Omit<Exercise, "id" | "isCustom">): Promise<Exercise> {
  const created = (await persistExercise({ data: { exercise: input } })) as Exercise;
  cache = [...(cache ?? []), created];
  return created;
}

/** Synchronous access to the already-loaded catalog (empty before first load). */
export function loadedExercises(): Exercise[] {
  return cache ?? [];
}

export async function primeExercises(): Promise<void> {
  await all();
}
