/**
 * Route storage: checkpoints, progress photos and the route start point.
 * Talks to Supabase when the route migration is applied and falls back to
 * localStorage otherwise, so the route always works on this device.
 */
import {
  deleteRouteCheckpoint,
  fetchRouteCheckpoints,
  fetchRoutePhotos,
  persistRouteCheckpoint,
  persistRoutePhoto,
} from "../forja.functions";
import type { Checkpoint, ProgressPhoto, RouteStart } from "../route/types";

const CP_KEY = "ironlogger.routeCheckpoints.v1";
const PHOTO_KEY = "ironlogger.routePhotos.v1";
const START_KEY = "ironlogger.routeStart.v1";

function readLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, 60)));
  } catch {
    /* storage unavailable */
  }
}

function localId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const byDate = (a: Checkpoint, b: Checkpoint) =>
  a.targetDate.localeCompare(b.targetDate) || a.orderIndex - b.orderIndex;

// ---- checkpoints -----------------------------------------------------------

let cpCache: Checkpoint[] | null = null;

export function invalidateRouteCache() {
  cpCache = null;
}

export async function getCheckpoints(): Promise<Checkpoint[]> {
  if (cpCache) return cpCache;
  let remote: Checkpoint[] = [];
  try {
    remote = ((await fetchRouteCheckpoints()) ?? []) as unknown as Checkpoint[];
  } catch {
    remote = [];
  }
  const local = readLocal<Checkpoint>(CP_KEY);
  // Remote wins when it has rows; otherwise this device's copy is the truth.
  cpCache = (remote.length ? remote : local).slice().sort(byDate);
  return cpCache;
}

export async function saveCheckpoint(
  input: Omit<Checkpoint, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<Checkpoint> {
  const now = new Date().toISOString();
  const existing = (cpCache ?? []).find((c) => c.id === input.id);
  const entry: Checkpoint = {
    ...input,
    id: input.id ?? localId("cp"),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  let saved: Checkpoint | null = null;
  try {
    saved = (await persistRouteCheckpoint({ data: entry })) as unknown as Checkpoint | null;
  } catch {
    saved = null;
  }
  const final = saved ?? entry;
  if (!saved) {
    writeLocal(CP_KEY, [final, ...readLocal<Checkpoint>(CP_KEY).filter((c) => c.id !== final.id)]);
  }
  cpCache = [...(cpCache ?? []).filter((c) => c.id !== final.id), final].sort(byDate);
  return final;
}

export async function saveCheckpoints(list: Checkpoint[]): Promise<Checkpoint[]> {
  const out: Checkpoint[] = [];
  for (const cp of list) out.push(await saveCheckpoint(cp));
  return out;
}

export async function removeCheckpoint(id: string): Promise<void> {
  cpCache = (cpCache ?? []).filter((c) => c.id !== id);
  writeLocal(
    CP_KEY,
    readLocal<Checkpoint>(CP_KEY).filter((c) => c.id !== id),
  );
  try {
    await deleteRouteCheckpoint({ data: { id } });
  } catch {
    /* local removal already done */
  }
}

// ---- progress photos -------------------------------------------------------

let photoCache: ProgressPhoto[] | null = null;

export async function getProgressPhotos(): Promise<ProgressPhoto[]> {
  if (photoCache) return photoCache;
  let remote: ProgressPhoto[] = [];
  try {
    remote = ((await fetchRoutePhotos()) ?? []) as unknown as ProgressPhoto[];
  } catch {
    remote = [];
  }
  const local = readLocal<ProgressPhoto>(PHOTO_KEY);
  photoCache = [...remote, ...local.filter((l) => !remote.some((r) => r.id === l.id))].sort(
    (a, b) => b.takenAt.localeCompare(a.takenAt),
  );
  return photoCache;
}

export async function addProgressPhoto(input: {
  dataUrl: string;
  checkpointId: string | null;
  visibleToAi: boolean;
  takenAt?: string;
}): Promise<ProgressPhoto> {
  const takenAt = input.takenAt ?? new Date().toISOString();
  let saved: ProgressPhoto | null = null;
  try {
    saved = (await persistRoutePhoto({
      data: {
        dataUrl: input.dataUrl,
        checkpointId: input.checkpointId,
        visibleToAi: input.visibleToAi,
        takenAt,
      },
    })) as unknown as ProgressPhoto | null;
  } catch {
    saved = null;
  }
  // Without the storage bucket the photo stays on this device.
  const final: ProgressPhoto = saved ?? {
    id: localId("ph"),
    checkpointId: input.checkpointId,
    url: input.dataUrl,
    takenAt,
    visibleToAi: input.visibleToAi,
    createdAt: new Date().toISOString(),
  };
  if (!saved) writeLocal(PHOTO_KEY, [final, ...readLocal<ProgressPhoto>(PHOTO_KEY)]);
  photoCache = [final, ...(photoCache ?? [])];
  return final;
}

/** Photos taken in the same calendar half-month window as `date`. */
export function photosInWindow(photos: ProgressPhoto[], date = new Date()): ProgressPhoto[] {
  const month = date.toISOString().slice(0, 7);
  const secondHalf = date.getDate() > 15;
  return photos.filter((p) => {
    if (p.takenAt.slice(0, 7) !== month) return false;
    return new Date(p.takenAt).getDate() > 15 === secondHalf;
  });
}

// ---- route start -----------------------------------------------------------

export function getRouteStart(): RouteStart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(START_KEY);
    return raw ? (JSON.parse(raw) as RouteStart) : null;
  } catch {
    return null;
  }
}

export function setRouteStart(start: RouteStart) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(START_KEY, JSON.stringify(start));
  } catch {
    /* storage unavailable */
  }
}
