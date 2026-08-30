/**
 * Pending workout saves. A gym is the worst place for reception, so a finished
 * workout that cannot reach the server is parked here and replayed later.
 * The queue lives in localStorage and is flushed on "online" and on app start.
 */

import type { Workout, WorkoutSet } from "./types";

const KEY = "forja.pendingWorkouts.v1";

export interface PendingWorkout {
  workout: Workout;
  sets: WorkoutSet[];
  queuedAt: string;
}

const listeners = new Set<(count: number) => void>();

function read(): PendingWorkout[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is PendingWorkout =>
        !!p && typeof p === "object" && !!(p as PendingWorkout).workout?.id,
    );
  } catch {
    return [];
  }
}

function write(list: PendingWorkout[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  listeners.forEach((fn) => fn(list.length));
}

export function pendingWorkouts(): PendingWorkout[] {
  return read();
}

export function pendingCount(): number {
  return read().length;
}

export function onPendingChange(fn: (count: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function enqueueWorkout(workout: Workout, sets: WorkoutSet[]) {
  const list = read().filter((p) => p.workout.id !== workout.id);
  list.push({ workout, sets, queuedAt: new Date().toISOString() });
  write(list);
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

let flushing = false;

/**
 * Try to persist everything queued. Returns how many made it through.
 * Items that fail stay in the queue for the next attempt.
 */
export async function flushQueue(
  save: (workout: Workout, sets: WorkoutSet[]) => Promise<unknown>,
): Promise<number> {
  if (flushing) return 0;
  const list = read();
  if (list.length === 0) return 0;
  flushing = true;
  let sent = 0;
  const remaining: PendingWorkout[] = [];
  for (const item of list) {
    try {
      await save(item.workout, item.sets);
      sent += 1;
    } catch {
      remaining.push(item);
    }
  }
  write(remaining);
  flushing = false;
  return sent;
}
