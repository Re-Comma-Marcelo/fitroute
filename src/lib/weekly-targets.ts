/**
 * Optional weekly targets beyond session count (volume in kg and working sets).
 * Local-only so the profile schema stays untouched.
 */
export interface WeeklyTargets {
  volumeKg: number;
  sets: number;
}

const KEY = "forja.weeklyTargets.v1";

export const EMPTY_TARGETS: WeeklyTargets = { volumeKg: 0, sets: 0 };

export function getWeeklyTargets(): WeeklyTargets {
  if (typeof window === "undefined") return EMPTY_TARGETS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_TARGETS;
    const parsed = JSON.parse(raw) as Partial<WeeklyTargets>;
    return {
      volumeKg: Number(parsed.volumeKg) > 0 ? Number(parsed.volumeKg) : 0,
      sets: Number(parsed.sets) > 0 ? Number(parsed.sets) : 0,
    };
  } catch {
    return EMPTY_TARGETS;
  }
}

export function setWeeklyTargets(targets: WeeklyTargets) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(targets));
}
