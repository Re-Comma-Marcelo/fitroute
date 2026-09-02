import { weekStart } from "@/lib/coach/signals";
import { isSerieDeCarga, isSerieValida } from "@/lib/progression";
import type { Exercise, Workout, WorkoutSet } from "@/lib/types";

export interface WeekTotals {
  sessions: number;
  volume: number;
  sets: number;
  /** Mean RPE across rated sets (0 when nothing rated). */
  rpe: number;
  /** Seconds logged in timed sets (plank, carries, cardio). */
  tempoSeg: number;
  /** Primary muscle groups trained, most volume first. */
  grupos: string[];
}

export interface WeekSummary {
  current: WeekTotals;
  previous: WeekTotals;
}

const EMPTY: WeekTotals = {
  sessions: 0,
  volume: 0,
  sets: 0,
  rpe: 0,
  tempoSeg: 0,
  grupos: [],
};

/** Current week vs the previous one, from data already loaded by Progress. */
export function weekSummary(
  workouts: Workout[],
  sets: WorkoutSet[],
  exercises: Pick<Exercise, "id" | "grupoPrimario">[],
  now = new Date(),
): WeekSummary {
  const thisWeek = weekStart(now);
  const prevDate = new Date(now);
  prevDate.setDate(prevDate.getDate() - 7);
  const lastWeek = weekStart(prevDate);

  const workoutWeek = new Map<string, string>();
  for (const w of workouts) workoutWeek.set(w.id, weekStart(new Date(w.iniciadoEm)));
  const groupOf = new Map<string, string>();
  for (const e of exercises) groupOf.set(e.id, e.grupoPrimario);

  const buckets: Record<string, WeekTotals & { rpeSum: number; rpeCount: number }> = {
    [thisWeek]: { ...EMPTY, grupos: [], rpeSum: 0, rpeCount: 0 },
    [lastWeek]: { ...EMPTY, grupos: [], rpeSum: 0, rpeCount: 0 },
  };
  const groupVolume: Record<string, Map<string, number>> = {
    [thisWeek]: new Map(),
    [lastWeek]: new Map(),
  };

  for (const w of workouts) {
    const week = workoutWeek.get(w.id);
    const bucket = week ? buckets[week] : undefined;
    if (bucket) bucket.sessions += 1;
  }

  for (const s of sets) {
    if (!s.concluida) continue;
    const week = workoutWeek.get(s.workoutId);
    const bucket = week ? buckets[week] : undefined;
    if (!week || !bucket) continue;

    if (s.tipoSerie === "tempo") {
      bucket.tempoSeg += s.reps;
      continue;
    }
    if (!isSerieValida(s)) continue;

    bucket.sets += 1;
    if (isSerieDeCarga(s)) {
      const volume = s.pesoKg * s.reps;
      bucket.volume += volume;
      const grupo = groupOf.get(s.exerciseId);
      if (grupo) {
        const map = groupVolume[week]!;
        map.set(grupo, (map.get(grupo) ?? 0) + volume);
      }
    }
    if (s.rpe) {
      bucket.rpeSum += s.rpe;
      bucket.rpeCount += 1;
    }
  }

  function finish(week: string): WeekTotals {
    const b = buckets[week]!;
    const grupos = [...groupVolume[week]!.entries()]
      .sort((a, b2) => b2[1] - a[1])
      .map(([grupo]) => grupo);
    return {
      sessions: b.sessions,
      volume: Math.round(b.volume),
      sets: b.sets,
      rpe: b.rpeCount ? Math.round((b.rpeSum / b.rpeCount) * 10) / 10 : 0,
      tempoSeg: b.tempoSeg,
      grupos,
    };
  }

  return { current: finish(thisWeek), previous: finish(lastWeek) };
}
