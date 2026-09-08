import type { Routine, Workout, WorkoutSet } from "./types";

/** Local YYYY-MM-DD key. */
export function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday 00:00 local of the week containing `d`. */
export function weekStartDate(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // 0 = Monday
  out.setDate(out.getDate() - dow);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function done(workouts: Workout[]): Workout[] {
  return workouts.filter((w) => w.finalizadoEm);
}

/** Volume of one workout: sum of weight x reps of completed sets, falling back to the stored total. */
export function workoutVolume(workout: Workout, sets: WorkoutSet[]): number {
  const own = sets.filter((s) => s.workoutId === workout.id && s.concluida);
  if (own.length === 0) return workout.volumeTotalKg ?? 0;
  return own.reduce((sum, s) => sum + s.pesoKg * s.reps, 0);
}

/** Volume totalled per week-start key. */
export function volumeByWeek(workouts: Workout[], sets: WorkoutSet[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of done(workouts)) {
    const key = isoDay(weekStartDate(new Date(w.iniciadoEm)));
    map.set(key, (map.get(key) ?? 0) + workoutVolume(w, sets));
  }
  return map;
}

export interface WeekVolume {
  current: number;
  previous: number;
  /** null when there is no previous week to compare against. */
  deltaPct: number | null;
  /** true when the current week beats every earlier week. */
  isRecord: boolean;
}

export function weeklyVolume(
  workouts: Workout[],
  sets: WorkoutSet[],
  now = new Date(),
): WeekVolume {
  const map = volumeByWeek(workouts, sets);
  const thisKey = isoDay(weekStartDate(now));
  const prevKey = isoDay(addDays(weekStartDate(now), -7));
  const current = map.get(thisKey) ?? 0;
  const previous = map.get(prevKey) ?? 0;
  const deltaPct = previous > 0 ? ((current - previous) / previous) * 100 : null;
  const earlierMax = [...map.entries()]
    .filter(([k]) => k < thisKey)
    .reduce((max, [, v]) => Math.max(max, v), 0);
  return { current, previous, deltaPct, isRecord: current > 0 && current > earlierMax };
}

export interface HeatCell {
  date: string;
  /** 0 = no session, 1 = short session, 2 = full session. */
  level: 0 | 1 | 2;
  isToday: boolean;
}

const SHORT_SESSION_SEC = 25 * 60;

/** `weeks` x 7 grid, oldest Monday first, ending on the current week. */
export function heatmap(workouts: Workout[], weeks = 8, now = new Date()): HeatCell[] {
  const start = addDays(weekStartDate(now), -7 * (weeks - 1));
  const byDay = new Map<string, Workout[]>();
  for (const w of done(workouts)) {
    const key = isoDay(new Date(w.iniciadoEm));
    byDay.set(key, [...(byDay.get(key) ?? []), w]);
  }
  const today = isoDay(now);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = isoDay(addDays(start, i));
    const day = byDay.get(date) ?? [];
    const level: 0 | 1 | 2 =
      day.length === 0
        ? 0
        : day.some((w) => w.duracaoSeg >= SHORT_SESSION_SEC) || day.length > 1
          ? 2
          : 1;
    return { date, level, isToday: date === today };
  });
}

export function sessionsThisWeek(workouts: Workout[], now = new Date()): number {
  const key = isoDay(weekStartDate(now));
  return done(workouts).filter((w) => isoDay(weekStartDate(new Date(w.iniciadoEm))) === key).length;
}

/** Consecutive weeks with at least one session, counting back from the current week. */
export function weekStreak(workouts: Workout[], now = new Date()): number {
  const weeks = new Set(done(workouts).map((w) => isoDay(weekStartDate(new Date(w.iniciadoEm)))));
  let cursor = weekStartDate(now);
  if (!weeks.has(isoDay(cursor))) {
    cursor = addDays(cursor, -7);
    if (!weeks.has(isoDay(cursor))) return 0;
  }
  let streak = 0;
  while (weeks.has(isoDay(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function trainedDays(cells: HeatCell[]): number {
  return cells.filter((c) => c.level > 0).length;
}

export interface PRInfo {
  exerciseId: string;
  pesoKg: number;
  reps: number;
  /** ISO date of the session where the record was set. */
  date: string;
}

/** Most recent weight record across all exercises, derived from completed sets. */
export function latestPR(workouts: Workout[], sets: WorkoutSet[]): PRInfo | null {
  const startedAt = new Map(workouts.map((w) => [w.id, w.iniciadoEm]));
  const chronological = sets
    .filter((s) => s.concluida && s.pesoKg > 0 && startedAt.has(s.workoutId))
    .sort(
      (a, b) =>
        (startedAt.get(a.workoutId) ?? "").localeCompare(startedAt.get(b.workoutId) ?? "") ||
        a.serieNum - b.serieNum,
    );
  const best = new Map<string, number>();
  let last: PRInfo | null = null;
  for (const s of chronological) {
    const prior = best.get(s.exerciseId) ?? 0;
    if (s.pesoKg > prior) {
      best.set(s.exerciseId, s.pesoKg);
      last = {
        exerciseId: s.exerciseId,
        pesoKg: s.pesoKg,
        reps: s.reps,
        date: startedAt.get(s.workoutId) ?? "",
      };
    }
  }
  return last;
}

/**
 * Next routine: a routine scheduled for today wins, otherwise the rotation
 * continues after the last completed routine session.
 */
export function nextRoutine(
  routines: Routine[],
  workouts: Workout[],
  now: Date = new Date(),
): Routine | null {
  if (routines.length === 0) return null;
  const today = routines.find((r) => (r.diasSemana ?? []).includes(now.getDay()));
  if (today) return today;
  const last = done(workouts)
    .filter((w) => w.routineId)
    .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm))[0];
  if (!last?.routineId) return routines[0] ?? null;
  const idx = routines.findIndex((r) => r.id === last.routineId);
  if (idx < 0) return routines[0] ?? null;
  return routines[(idx + 1) % routines.length] ?? null;
}
