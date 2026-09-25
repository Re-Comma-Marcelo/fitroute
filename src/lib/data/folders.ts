import { loadFolders, persistFolder } from "../forja.functions";
import { tx } from "../format";
import type { Routine, TrainingFolder, Workout, WorkoutSet } from "../types";
import { copyRoutinesToFolder, refreshRoutines } from "./routines";
import { refreshWorkoutLog } from "./workouts";

let cache: TrainingFolder[] | null = null;
let inflight: Promise<TrainingFolder[]> | null = null;

async function all(): Promise<TrainingFolder[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = loadFolders({ data: { defaultName: tx("My training") } })
      .then((list) => {
        cache = list as TrainingFolder[];
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** All folders, oldest first. Empty until the folders migration is applied. */
export async function getFolders(): Promise<TrainingFolder[]> {
  return (await all()).map((f) => ({ ...f }));
}

export async function getFolder(id: string): Promise<TrainingFolder | null> {
  return (await all()).find((f) => f.id === id) ?? null;
}

/** The folder new routines and sessions go into; null before the migration. */
export async function getCurrentFolder(): Promise<TrainingFolder | null> {
  return (await all()).find((f) => f.status === "atual") ?? null;
}

export async function saveFolder(folder: TrainingFolder): Promise<TrainingFolder> {
  const saved = (await persistFolder({ data: { folder } })) as TrainingFolder;
  // Making a folder current archives the previous one server-side, and rows
  // cached without a folder must not follow the switch: refetch everything.
  cache = null;
  refreshRoutines();
  refreshWorkoutLog();
  return saved;
}

export async function renameFolder(id: string, nome: string): Promise<TrainingFolder | null> {
  const folder = await getFolder(id);
  if (!folder) return null;
  return saveFolder({ ...folder, nome });
}

/** Switch the current folder; the previous current one is archived. */
export async function makeFolderCurrent(id: string): Promise<TrainingFolder | null> {
  const folder = await getFolder(id);
  if (!folder) return null;
  return saveFolder({ ...folder, status: "atual" });
}

/**
 * Start a new current folder. With `copy`, those routines come along (new
 * ids), so the next block starts from where this one ended.
 */
export async function createFolder(nome: string, copy: Routine[] = []): Promise<TrainingFolder> {
  const created = await saveFolder({
    id: "",
    nome,
    status: "atual",
    inicioEm: new Date().toISOString(),
  });
  if (copy.length) await copyRoutinesToFolder(copy, created.id);
  return created;
}

/** A session's swaps as original exercise id -> the one done instead. */
export function sessionSwapMap(sets: WorkoutSet[], workoutId: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of sets) {
    if (s.workoutId === workoutId && s.substituiExerciseId) {
      map[s.substituiExerciseId] = s.exerciseId;
    }
  }
  return map;
}

/** Routines filed in `folderId`; a routine with no folder counts as the current one's. */
export function routinesInFolder(
  routines: Routine[],
  folderId: string,
  currentId: string | null,
): Routine[] {
  return routines.filter((r) => (r.folderId ?? currentId) === folderId);
}

/** Sessions done while `folderId` was current (same fallback as routines). */
export function workoutsInFolder(
  workouts: Workout[],
  folderId: string,
  currentId: string | null,
): Workout[] {
  return workouts.filter((w) => (w.folderId ?? currentId) === folderId);
}

/** Standard routines first; variations follow, quieter. */
export function isStandard(routine: Routine): boolean {
  return (routine.papel ?? "padrao") === "padrao";
}
