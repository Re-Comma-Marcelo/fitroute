import { loadFolders, persistFolder } from "../forja.functions";
import { tx } from "../format";
import type { Routine, SwapReason, TrainingFolder, Workout, WorkoutSet } from "../types";
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

export interface VariationSession {
  workout: Workout;
  routine: Routine;
  /** Original exercise id -> the one done instead. */
  swaps: Record<string, string>;
}

/**
 * Sessions that strayed from a routine still on file, newest first. A session
 * whose swaps have since become the routine's standard is left out: nothing
 * sets it apart any more.
 */
export function variationSessionsOf(
  workouts: Workout[],
  routines: Routine[],
  sets: WorkoutSet[],
  limit = Infinity,
): VariationSession[] {
  const out: VariationSession[] = [];
  const newestFirst = [...workouts].sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm));
  for (const w of newestFirst) {
    if (!w.variacao || !w.routineId) continue;
    const routine = routines.find((r) => r.id === w.routineId);
    if (!routine) continue;
    const swaps = sessionSwapMap(sets, w.id);
    const absorbed =
      Object.keys(swaps).length > 0 &&
      Object.entries(swaps).every(
        ([from, to]) =>
          routine.exercicios.some((re) => re.exerciseId === to) &&
          !routine.exercicios.some((re) => re.exerciseId === from),
      );
    if (absorbed) continue;
    out.push({ workout: w, routine, swaps });
    if (out.length >= limit) break;
  }
  return out;
}

export interface SwapStat {
  /** Muscle group of the standard exercise that was replaced. */
  group: string;
  from: string;
  to: string;
  /** Sessions in which this swap happened. */
  count: number;
  /** Reasons given for those sessions, most frequent first. */
  reasons: SwapReason[];
}

/** Which standard exercises get replaced, by what, how often and why. */
export function swapStats(
  workouts: Workout[],
  sets: WorkoutSet[],
  groupOf: (exerciseId: string) => string,
): SwapStat[] {
  const byId = new Map(workouts.map((w) => [w.id, w]));
  const seen = new Set<string>();
  const stats = new Map<
    string,
    { from: string; to: string; count: number; reasons: SwapReason[] }
  >();
  for (const s of sets) {
    if (!s.substituiExerciseId) continue;
    const w = byId.get(s.workoutId);
    if (!w) continue;
    const key = `${s.substituiExerciseId}>${s.exerciseId}`;
    // Count each swap once per session, not once per set.
    if (seen.has(`${w.id}|${key}`)) continue;
    seen.add(`${w.id}|${key}`);
    const entry = stats.get(key) ?? {
      from: s.substituiExerciseId,
      to: s.exerciseId,
      count: 0,
      reasons: [],
    };
    entry.count += 1;
    if (w.motivo) entry.reasons.push(w.motivo);
    stats.set(key, entry);
  }
  return [...stats.values()]
    .map((e) => {
      const tally = new Map<SwapReason, number>();
      e.reasons.forEach((r) => tally.set(r, (tally.get(r) ?? 0) + 1));
      return {
        ...e,
        group: groupOf(e.from),
        reasons: [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r),
      };
    })
    .sort((a, b) => b.count - a.count);
}
