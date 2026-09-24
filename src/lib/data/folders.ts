import { loadFolders, persistFolder } from "../forja.functions";
import { tx } from "../format";
import type { Routine, TrainingFolder, Workout } from "../types";

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
  // Making a folder current archives the previous one server-side: refetch.
  cache = null;
  return saved;
}

export async function createFolder(nome: string): Promise<TrainingFolder> {
  return saveFolder({ id: "", nome, status: "atual", inicioEm: new Date().toISOString() });
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
