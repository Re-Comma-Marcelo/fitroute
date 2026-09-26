import { loadFolders, persistFolder } from "../forja.functions";
import { formatKg, tx } from "../format";
import type { Routine, SwapReason, TrainingFolder, Workout, WorkoutSet } from "../types";
import { copyRoutinesToFolder, refreshRoutines, saveRoutine } from "./routines";
import { getWorkoutLog, refreshWorkoutLog } from "./workouts";

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
export async function createFolder(
  nome: string,
  copy: Routine[] = [],
  opts: { origemModeloId?: string } = {},
): Promise<TrainingFolder> {
  const created = await saveFolder({
    id: "",
    nome,
    status: "atual",
    inicioEm: new Date().toISOString(),
    ...(opts.origemModeloId ? { origemModeloId: opts.origemModeloId } : {}),
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

// ---- closing a cycle ---------------------------------------------------------

export interface RecurringSwap {
  routineId: string;
  routineNome: string;
  from: string;
  to: string;
  /** Sessions of the routine with this swap. */
  count: number;
  /** Sessions of the routine in the folder. */
  total: number;
}

/**
 * Swaps that stuck: done in at least half of a standard routine's sessions
 * (and at least twice). These are the candidates to become the template's
 * standard when the cycle closes.
 */
export function recurringSwaps(
  routines: Routine[],
  workouts: Workout[],
  sets: WorkoutSet[],
): RecurringSwap[] {
  const out: RecurringSwap[] = [];
  for (const r of routines.filter(isStandard)) {
    const sessions = workouts.filter((w) => w.routineId === r.id);
    if (sessions.length < 2) continue;
    const tally = new Map<string, number>();
    for (const w of sessions) {
      for (const [from, to] of Object.entries(sessionSwapMap(sets, w.id))) {
        tally.set(`${from}>${to}`, (tally.get(`${from}>${to}`) ?? 0) + 1);
      }
    }
    // One replacement per standard exercise: the most frequent wins.
    const best = new Map<string, { to: string; count: number }>();
    for (const [key, count] of tally) {
      const [from, to] = key.split(">") as [string, string];
      if (!r.exercicios.some((re) => re.exerciseId === from)) continue;
      if (count < 2 || count / sessions.length < 0.5) continue;
      const prev = best.get(from);
      if (!prev || count > prev.count) best.set(from, { to, count });
    }
    for (const [from, { to, count }] of best) {
      out.push({ routineId: r.id, routineNome: r.nome, from, to, count, total: sessions.length });
    }
  }
  return out;
}

export interface ReferenceLoad {
  pesoKg: number;
  reps: number;
}

/** Top working set of the latest session that did each exercise. */
export function referenceLoads(
  exerciseIds: string[],
  workouts: Workout[],
  sets: WorkoutSet[],
): Map<string, ReferenceLoad> {
  const newestFirst = [...workouts].sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm));
  const loads = new Map<string, ReferenceLoad>();
  for (const exerciseId of new Set(exerciseIds)) {
    for (const w of newestFirst) {
      const working = sets.filter(
        (s) =>
          s.workoutId === w.id &&
          s.exerciseId === exerciseId &&
          s.concluida &&
          s.tipoSerie !== "aquecimento" &&
          s.pesoKg > 0,
      );
      if (!working.length) continue;
      const top = working.reduce((a, b) =>
        b.pesoKg > a.pesoKg || (b.pesoKg === a.pesoKg && b.reps > a.reps) ? b : a,
      );
      loads.set(exerciseId, { pesoKg: top.pesoKg, reps: top.reps });
      break;
    }
  }
  return loads;
}

/**
 * Lines the app writes into a routine exercise's notes (the reference load at
 * the end of a cycle). Marked so they can be replaced next time, and kept out
 * of the workout notes.
 */
export const REFERENCE_PREFIX = "📌 ";

export function stripReferenceNotes(notas: string): string {
  return notas
    .split("\n")
    .filter((line) => !line.startsWith(REFERENCE_PREFIX))
    .join("\n")
    .trim();
}

function withReference(notas: string, line: string): string {
  return [stripReferenceNotes(notas), `${REFERENCE_PREFIX}${line}`].filter(Boolean).join("\n");
}

/**
 * Close a cycle: apply the chosen recurring swaps to the standard routines,
 * write each exercise's reference load into its notes, and turn the folder
 * into a template. With `next`, a new current folder starts right away, from
 * this template or empty.
 */
export async function closeFolderAsTemplate(input: {
  folder: TrainingFolder;
  /** The folder's routines (standard and variations). */
  routines: Routine[];
  swaps: RecurringSwap[];
  loads: Map<string, ReferenceLoad> | null;
  next?: { nome: string; fromTemplate: boolean; withVariations: boolean };
}): Promise<{ template: TrainingFolder; next: TrainingFolder | null }> {
  const { folder, routines, swaps, loads, next } = input;
  const updated: Routine[] = [];
  for (const r of routines) {
    if (!isStandard(r)) {
      updated.push(r);
      continue;
    }
    const mine = new Map(swaps.filter((s) => s.routineId === r.id).map((s) => [s.from, s.to]));
    const exercicios = r.exercicios.map((ex) => {
      const exerciseId = mine.get(ex.exerciseId) ?? ex.exerciseId;
      const load = loads?.get(exerciseId);
      const notas = load
        ? withReference(
            ex.notas,
            tx("End of {folder}: {load}", {
              folder: folder.nome,
              load: `${formatKg(load.pesoKg)} × ${load.reps}`,
            }),
          )
        : ex.notas;
      return { ...ex, exerciseId, notas };
    });
    const changed = exercicios.some(
      (ex, i) =>
        ex.exerciseId !== r.exercicios[i]?.exerciseId || ex.notas !== r.exercicios[i]?.notas,
    );
    updated.push(changed ? await saveRoutine({ ...r, exercicios }) : r);
  }

  const template = await saveFolder({
    ...folder,
    status: "modelo",
    fimEm: folder.fimEm ?? new Date().toISOString(),
  });

  let created: TrainingFolder | null = null;
  if (next) {
    const copy = next.fromTemplate
      ? updated.filter((r) => next.withVariations || isStandard(r))
      : [];
    created = await createFolder(
      next.nome,
      copy,
      next.fromTemplate ? { origemModeloId: template.id } : {},
    );
  }
  return { template, next: created };
}

/** Start the next current folder from a template's routines. */
export async function startFromTemplate(input: {
  template: TrainingFolder;
  routines: Routine[];
  nome: string;
  withVariations: boolean;
}): Promise<TrainingFolder> {
  const copy = input.routines.filter((r) => input.withVariations || isStandard(r));
  return createFolder(input.nome, copy, { origemModeloId: input.template.id });
}

/** "Hypertrophy" -> "Hypertrophy · 2", "Hypertrophy · 2" -> "Hypertrophy · 3". */
export function nextCycleName(nome: string): string {
  const m = nome.match(/^(.*?)(\d+)\s*$/);
  if (m) return `${m[1]}${Number(m[2]) + 1}`;
  return `${nome} · 2`;
}

/** What has stood in for `exerciseId` in these sessions, most frequent first. */
export function pastSwapsFor(
  exerciseId: string,
  workouts: Workout[],
  sets: WorkoutSet[],
): string[] {
  const ids = new Set(workouts.map((w) => w.id));
  const perSession = new Set<string>();
  const tally = new Map<string, number>();
  for (const s of sets) {
    if (s.substituiExerciseId !== exerciseId || !ids.has(s.workoutId)) continue;
    const key = `${s.workoutId}|${s.exerciseId}`;
    if (perSession.has(key)) continue;
    perSession.add(key);
    tally.set(s.exerciseId, (tally.get(s.exerciseId) ?? 0) + 1);
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** pastSwapsFor over the current folder's sessions; [] before the migration. */
export async function getPastSwaps(exerciseId: string): Promise<string[]> {
  const [folder, log] = await Promise.all([getCurrentFolder().catch(() => null), getWorkoutLog()]);
  const workouts = folder ? workoutsInFolder(log.workouts, folder.id, folder.id) : log.workouts;
  return pastSwapsFor(exerciseId, workouts, log.sets);
}
