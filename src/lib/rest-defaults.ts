/**
 * Per-exercise rest length chosen by the user in the rest bar ("save as default
 * for this exercise"). Local only: no backend, no migration.
 */

const KEY = "forja.restDefaults.v1";

export const REST_MIN_SEG = 10;
export const REST_MAX_SEG = 600;
export const REST_PRESETS = [60, 90, 120, 180] as const;

export function clampRest(segundos: number): number {
  if (!Number.isFinite(segundos)) return 90;
  return Math.max(REST_MIN_SEG, Math.min(REST_MAX_SEG, Math.round(segundos)));
}

function readAll(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

export function getRestDefault(exerciseId: string): number | null {
  const value = readAll()[exerciseId];
  return typeof value === "number" && value > 0 ? clampRest(value) : null;
}

export function setRestDefault(exerciseId: string, segundos: number) {
  if (typeof window === "undefined") return;
  try {
    const all = readAll();
    all[exerciseId] = clampRest(segundos);
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}
