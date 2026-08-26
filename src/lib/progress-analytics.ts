import { perWorkoutStats, weekStart } from "@/lib/coach/signals";
import { formatDayMonth } from "@/lib/format";
import type { Workout, WorkoutSet } from "@/lib/types";

export interface StatDelta {
  /** Signed difference (current - previous) in the metric's own unit. */
  diff: number;
  /** Percentage change, null when the previous period was zero. */
  pct: number | null;
}

export interface PeriodStats {
  sessions: number;
  volume: number;
  avgDurationSeg: number;
}

export interface MonthComparison {
  current: PeriodStats;
  previous: PeriodStats | null;
  sessionsDelta: StatDelta | null;
  volumeDelta: StatDelta | null;
  durationDelta: StatDelta | null;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function statsFor(list: Workout[]): PeriodStats {
  const volume = list.reduce((s, w) => s + w.volumeTotalKg, 0);
  const duration = list.reduce((s, w) => s + w.duracaoSeg, 0);
  return {
    sessions: list.length,
    volume,
    avgDurationSeg: list.length ? duration / list.length : 0,
  };
}

function delta(current: number, previous: number): StatDelta {
  return {
    diff: current - previous,
    pct: previous > 0 ? ((current - previous) / previous) * 100 : null,
  };
}

export function monthComparison(workouts: Workout[], now = new Date()): MonthComparison {
  const cur = monthKey(now.toISOString());
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prev = monthKey(prevDate.toISOString());

  const currentList = workouts.filter((w) => monthKey(w.iniciadoEm) === cur);
  const previousList = workouts.filter((w) => monthKey(w.iniciadoEm) === prev);

  const current = statsFor(currentList);
  if (previousList.length === 0) {
    return {
      current,
      previous: null,
      sessionsDelta: null,
      volumeDelta: null,
      durationDelta: null,
    };
  }
  const previous = statsFor(previousList);
  return {
    current,
    previous,
    sessionsDelta: delta(current.sessions, previous.sessions),
    volumeDelta: delta(current.volume, previous.volume),
    durationDelta: delta(current.avgDurationSeg, previous.avgDurationSeg),
  };
}

export interface Adherence {
  /** Sessions logged in the current calendar month. */
  done: number;
  /** Planned sessions so far this month, from the weekly target. */
  planned: number;
  /** Consecutive weeks (ending with the last complete or current week) hitting the target. */
  streakWeeks: number;
}

export function adherence(
  workouts: Workout[],
  weeklyTarget: number,
  now = new Date(),
): Adherence {
  const cur = monthKey(now.toISOString());
  const done = workouts.filter((w) => monthKey(w.iniciadoEm) === cur).length;
  const daysElapsed = now.getDate();
  const planned = Math.max(
    1,
    Math.round((weeklyTarget * daysElapsed) / 7),
  );

  const perWeek = new Map<string, number>();
  for (const w of workouts) {
    const key = weekStart(new Date(w.iniciadoEm));
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1);
  }

  let streakWeeks = 0;
  const cursor = new Date(weekStart(now));
  // The current week counts only if the target is already met; otherwise start from last week.
  if ((perWeek.get(cursor.toISOString()) ?? 0) < weeklyTarget) {
    cursor.setDate(cursor.getDate() - 7);
  }
  for (let i = 0; i < 52; i++) {
    const key = new Date(weekStart(cursor)).toISOString();
    if ((perWeek.get(key) ?? 0) >= weeklyTarget) {
      streakWeeks += 1;
      cursor.setDate(cursor.getDate() - 7);
    } else break;
  }

  return { done, planned, streakWeeks };
}

export interface WeekPoint {
  weekStart: string;
  label: string;
  volume: number;
  sessions: number;
}

/** Continuous weekly series (zero-filled) for the last `weeks` weeks. */
export function weeklySeries(
  workouts: Workout[],
  weeks = 8,
  now = new Date(),
): WeekPoint[] {
  const buckets = new Map<string, { volume: number; sessions: number }>();
  for (const w of workouts) {
    const key = weekStart(new Date(w.iniciadoEm));
    const entry = buckets.get(key) ?? { volume: 0, sessions: 0 };
    entry.volume += w.volumeTotalKg;
    entry.sessions += 1;
    buckets.set(key, entry);
  }

  const out: WeekPoint[] = [];
  const cursor = new Date(weekStart(now));
  cursor.setDate(cursor.getDate() - (weeks - 1) * 7);
  for (let i = 0; i < weeks; i++) {
    const key = new Date(weekStart(cursor)).toISOString();
    const entry = buckets.get(key) ?? { volume: 0, sessions: 0 };
    out.push({
      weekStart: key,
      label: formatDayMonth(new Date(key)),
      volume: Math.round(entry.volume),
      sessions: entry.sessions,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

export interface LiftTrend {
  exerciseId: string;
  firstWeight: number;
  lastWeight: number;
  /** Weeks between the first and last logged session of the lift. */
  spanWeeks: number;
  sessions: number;
  direction: "up" | "flat" | "down";
  /** Best weight per session, oldest to newest — sparkline input. */
  points: number[];
  lastDate: string;
}

export function liftTrend(
  exerciseId: string,
  workouts: Workout[],
  sets: WorkoutSet[],
): LiftTrend | null {
  const history = sets.filter((s) => s.exerciseId === exerciseId && s.concluida);
  if (history.length === 0) return null;
  const stats = perWorkoutStats(history, workouts).filter((s) => s.maxWeight > 0);
  if (stats.length === 0) return null;

  const first = stats[0]!;
  const last = stats[stats.length - 1]!;
  const spanDays = Math.max(
    0,
    (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000,
  );
  const diff = last.maxWeight - first.maxWeight;
  return {
    exerciseId,
    firstWeight: first.maxWeight,
    lastWeight: last.maxWeight,
    spanWeeks: Math.max(1, Math.round(spanDays / 7)),
    sessions: stats.length,
    direction: diff > 0.4 ? "up" : diff < -0.4 ? "down" : "flat",
    points: stats.map((s) => s.maxWeight),
    lastDate: last.date,
  };
}
