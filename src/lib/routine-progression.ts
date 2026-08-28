import { getExercise } from "./data/exercises";
import { getLastSetsForExercise } from "./data/workouts";
import { suggestProgression, type PrevSet, type ProgressionSuggestion } from "./progression";
import type { Routine } from "./types";

/** Sugestões de progressão por exerciseId, para exibir o badge nas listas. */
export async function getRoutineSuggestions(
  routine: Routine,
): Promise<Record<string, ProgressionSuggestion>> {
  const entradas = await Promise.all(
    routine.exercicios.map(async (re) => {
      const [exercise, last] = await Promise.all([
        getExercise(re.exerciseId),
        getLastSetsForExercise(re.exerciseId),
      ]);
      if (!exercise) return null;
      const anteriores: PrevSet[] = last.map((s) => ({
        pesoKg: s.pesoKg,
        reps: s.reps,
        tipoSerie: s.tipoSerie,
        ...(typeof s.rpe === "number" ? { rpe: s.rpe } : {}),
      }));
      const sugestao = suggestProgression({
        anteriores,
        repsMin: re.repsMin,
        repsMax: re.repsMax,
        equipamento: exercise.equipamento,
      });
      return sugestao?.aumentou ? ([re.exerciseId, sugestao] as const) : null;
    }),
  );
  return Object.fromEntries(
    entradas.filter((e): e is [string, ProgressionSuggestion] => e !== null),
  );
}
