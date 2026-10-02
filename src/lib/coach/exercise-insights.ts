import { getExercise } from "@/lib/data/exercises";
import { tx } from "@/lib/format";
import { getLastSetsForExercise, getWorkouts, getWorkoutSets } from "@/lib/data/workouts";
import { suggestProgression } from "@/lib/progression";
import { RPE_FATIGUE_MIN } from "@/lib/rpe";
import { isSameWeightForLastN, perWorkoutStats, rpeTrend } from "./signals";
import type { CoachInsight } from "./types";
import type { Routine, Workout, WorkoutSet } from "@/lib/types";

export async function getRoutineInsights(
  routine: Routine,
  allWorkouts?: Workout[],
  allSets?: WorkoutSet[],
): Promise<Record<string, CoachInsight>> {
  const workouts: Workout[] = allWorkouts ?? (await getWorkouts());
  const sets: WorkoutSet[] =
    allSets ?? (await Promise.all(workouts.map((w) => getWorkoutSets(w.id)))).flat();
  const result: Record<string, CoachInsight> = {};
  for (const re of routine.exercicios) {
    const insight = await getExerciseInsight(re, workouts, sets);
    if (insight) result[re.exerciseId] = insight;
  }
  return result;
}

export async function getExerciseInsight(
  re: Routine["exercicios"][number],
  workouts: Workout[],
  allSets: WorkoutSet[],
): Promise<CoachInsight | null> {
  const exercise = await getExercise(re.exerciseId);
  if (!exercise) return null;

  const history = allSets
    .filter((s) => s.exerciseId === re.exerciseId && s.concluida)
    .sort((a, b) => {
      const da = new Date(workouts.find((w) => w.id === a.workoutId)?.iniciadoEm ?? 0).getTime();
      const db = new Date(workouts.find((w) => w.id === b.workoutId)?.iniciadoEm ?? 0).getTime();
      return da - db || a.serieNum - b.serieNum;
    });

  if (history.length === 0) return null;

  const stats = perWorkoutStats(history, workouts);
  const last = stats[stats.length - 1]!;
  const prev = stats.length > 1 ? stats[stats.length - 2] : null;

  const lastSets = await getLastSetsForExercise(re.exerciseId);
  const suggestion = suggestProgression({
    anteriores: lastSets.map((s) => ({
      pesoKg: s.pesoKg,
      reps: s.reps,
      tipoSerie: s.tipoSerie,
      ...(typeof s.rpe === "number" ? { rpe: s.rpe } : {}),
    })),
    repsMin: re.repsMin,
    repsMax: re.repsMax,
    equipamento: exercise.equipamento,
    grupoPrimario: exercise.grupoPrimario,
  });

  if (suggestion?.aumentou) {
    return {
      id: `inc-${re.exerciseId}`,
      scope: "exercise",
      severity: "nudge",
      title: tx("Weight increased"),
      body: suggestion.motivo,
      plateauType: "strength",
      exerciseId: re.exerciseId,
    };
  }

  if (stats.length >= 3 && isSameWeightForLastN(stats, 3)) {
    return {
      id: `stall-${re.exerciseId}`,
      scope: "exercise",
      severity: "nudge",
      title: tx("Stalled"),
      body: tx(
        "Same weight 3 sessions running — worth pushing for an extra rep or more load if form is clean.",
      ),
      plateauType: "single-exercise",
      exerciseId: re.exerciseId,
    };
  }

  const trend = rpeTrend(stats);
  if (
    trend === "up" &&
    last.avgRpe &&
    last.avgRpe >= RPE_FATIGUE_MIN &&
    prev &&
    last.maxWeight <= prev.maxWeight
  ) {
    return {
      id: `fatigue-${re.exerciseId}`,
      scope: "exercise",
      severity: "warning",
      title: tx("Fatigue rising"),
      body: tx(
        "Difficulty is climbing while the weight is flat. A lighter or deload session next time could help.",
      ),
      plateauType: "fatigue",
      exerciseId: re.exerciseId,
    };
  }

  if (prev && last.maxWeight < prev.maxWeight) {
    return {
      id: `drop-${re.exerciseId}`,
      scope: "exercise",
      severity: "warning",
      title: tx("Performance dropped"),
      body: tx("Weight dropped from the last session. Prioritize recovery before pushing again."),
      plateauType: "fatigue",
      exerciseId: re.exerciseId,
    };
  }

  // Hold / neutral insight
  return {
    id: `hold-${re.exerciseId}`,
    scope: "exercise",
    severity: "info",
    title: tx("Hold"),
    body: tx("Aim for {min}-{max} reps before adding weight.", {
      min: re.repsMin,
      max: re.repsMax,
    }),
    exerciseId: re.exerciseId,
  };
}
