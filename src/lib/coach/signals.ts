import type { Workout, WorkoutSet } from "../types";

export interface PerWorkoutStats {
  workoutId: string;
  date: string;
  maxWeight: number;
  totalReps: number;
  avgRpe: number | null;
  validSets: number;
  volume: number;
}

function groupByWorkout(sets: WorkoutSet[], workouts: Workout[]): Map<string, WorkoutSet[]> {
  const order = new Map(workouts.map((w) => [w.id, new Date(w.iniciadoEm).getTime()]));
  const map = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    if (!map.has(s.workoutId)) map.set(s.workoutId, []);
    map.get(s.workoutId)!.push(s);
  }
  const sorted = [...map.entries()].sort((a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0));
  return new Map(sorted);
}

export function perWorkoutStats(sets: WorkoutSet[], workouts: Workout[]): PerWorkoutStats[] {
  const map = groupByWorkout(sets, workouts);
  const dateOf = new Map(workouts.map((w) => [w.id, w.iniciadoEm]));
  return [...map.entries()].map(([workoutId, list]) => {
    const valid = list.filter((s) => s.tipoSerie !== "aquecimento" && s.concluida);
    const maxWeight = valid.reduce((max, s) => Math.max(max, s.pesoKg), 0);
    const totalReps = valid.reduce((sum, s) => sum + s.reps, 0);
    const rpes = valid.map((s) => s.rpe).filter((v): v is number => typeof v === "number" && v > 0);
    const avgRpe = rpes.length
      ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10
      : null;
    const volume = valid.reduce((sum, s) => sum + s.pesoKg * s.reps, 0);
    return {
      workoutId,
      date: dateOf.get(workoutId) ?? "",
      maxWeight,
      totalReps,
      avgRpe,
      validSets: valid.length,
      volume,
    };
  });
}

export function isSameWeightForLastN(stats: PerWorkoutStats[], n: number): boolean {
  if (stats.length < n) return false;
  const last = stats.slice(-n);
  return last.every((s) => s.maxWeight === last[0]!.maxWeight && s.maxWeight > 0);
}

export function sessionsSinceWeightIncrease(stats: PerWorkoutStats[]): number {
  if (stats.length < 2) return 0;
  const lastMax = stats[stats.length - 1]!.maxWeight;
  for (let i = stats.length - 2; i >= 0; i--) {
    if (stats[i]!.maxWeight > lastMax) {
      return stats.length - 1 - i - 1;
    }
  }
  return stats.length - 1;
}

export function rpeTrend(stats: PerWorkoutStats[]): "up" | "down" | "flat" | null {
  if (stats.length < 2) return null;
  const avg = stats
    .slice(-3)
    .map((s) => s.avgRpe)
    .filter((v): v is number => v !== null);
  if (avg.length < 2) return null;
  const first = avg[0]!;
  const end = avg[avg.length - 1]!;
  if (end - first > 0.5) return "up";
  if (first - end > 0.5) return "down";
  return "flat";
}

export function weekStart(date: Date): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function currentWeekStart(): string {
  return weekStart(new Date());
}

export function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

export function weeklyAggregate(
  workouts: Workout[],
  sets: WorkoutSet[],
): { weekStart: string; sessions: number; volume: number; sets: number }[] {
  const map = new Map<string, { sessions: number; volume: number; sets: number }>();
  for (const w of workouts) {
    const ws = weekStart(new Date(w.iniciadoEm));
    if (!map.has(ws)) map.set(ws, { sessions: 0, volume: 0, sets: 0 });
    const entry = map.get(ws)!;
    entry.sessions += 1;
    entry.volume += w.volumeTotalKg;
  }
  for (const s of sets) {
    const w = workouts.find((x) => x.id === s.workoutId);
    if (!w || s.tipoSerie === "aquecimento") continue;
    const ws = weekStart(new Date(w.iniciadoEm));
    const entry = map.get(ws)!;
    entry.sets += 1;
  }
  return [...map.entries()]
    .map(([ws, v]) => ({ weekStart: ws, ...v }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function muscleGroupVolumeThisWeek(
  workouts: Workout[],
  sets: WorkoutSet[],
  exercises: { id: string; grupoPrimario: string }[],
): Map<string, number> {
  const start = currentWeekStart();
  const load = new Map<string, number>();
  for (const s of sets) {
    const w = workouts.find((x) => x.id === s.workoutId);
    if (!w || new Date(w.iniciadoEm).toISOString() < start || s.tipoSerie === "aquecimento")
      continue;
    const ex = exercises.find((e) => e.id === s.exerciseId);
    if (!ex) continue;
    load.set(ex.grupoPrimario, (load.get(ex.grupoPrimario) ?? 0) + s.pesoKg * s.reps);
  }
  return load;
}
