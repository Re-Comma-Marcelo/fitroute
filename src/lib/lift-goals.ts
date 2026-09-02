/**
 * Per-lift targets ("get bench to 100kg"). Local-only: no schema change, and a
 * goal is a personal intention rather than logged training data.
 */

export type GoalMetric = "load" | "e1rm";

export interface LiftGoal {
  exerciseId: string;
  metric: GoalMetric;
  targetKg: number;
}

const KEY = "forja.liftGoals.v1";

function readAll(): Record<string, LiftGoal> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LiftGoal>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function getLiftGoals(): Record<string, LiftGoal> {
  return readAll();
}

export function getLiftGoal(exerciseId: string): LiftGoal | null {
  return readAll()[exerciseId] ?? null;
}

export function setLiftGoal(goal: LiftGoal) {
  if (typeof window === "undefined") return;
  const all = readAll();
  all[goal.exerciseId] = goal;
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function clearLiftGoal(exerciseId: string) {
  if (typeof window === "undefined") return;
  const all = readAll();
  delete all[exerciseId];
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

/** 0-100 progress of `current` towards the goal. */
export function goalProgress(current: number, targetKg: number): number {
  if (targetKg <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / targetKg) * 100)));
}
