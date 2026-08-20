import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { suggestProgression, type PrevSet, type ProgressionSuggestion } from "./progression";
import type { Database } from "./database.types";
import type { Routine } from "./types";

function mapExerciseRow(
  row: Database["public"]["Tables"]["exercises"]["Row"],
): {
  id: string;
  nome: string;
  equipamento: string;
} {
  return {
    id: row.id,
    nome: row.nome,
    equipamento: row.equipamento,
  };
}

function mapSetRow(
  row: Database["public"]["Tables"]["workout_sets"]["Row"],
): PrevSet & { exerciseId: string } {
  return {
    exerciseId: row.exercise_id,
    pesoKg: Number(row.peso_kg),
    reps: row.reps,
    tipoSerie: row.tipo_serie as PrevSet["tipoSerie"],
    ...(typeof row.rpe === "number" ? { rpe: row.rpe } : {}),
  };
}

export const getRoutineSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const routine = data as Routine;
    if (!routine.exercicios.length) return {};

    const exerciseIds = [...new Set(routine.exercicios.map((re) => re.exerciseId))];

    const { data: exercises, error: exercisesError } = await context.supabase
      .from("exercises")
      .select("*")
      .in("id", exerciseIds)
      .or(`user_id.is.null, user_id.eq.${context.userId}`);
    if (exercisesError) throw exercisesError;
    const exerciseById = new Map(exercises?.map(mapExerciseRow).map((e) => [e.id, e]));

    const { data: lastSets, error: lastSetsError } = await context.supabase
      .from("workouts")
      .select("id, workout_sets(*)")
      .eq("user_id", context.userId)
      .not("finalizado_em", "is", null)
      .in("workout_sets.exercise_id", exerciseIds)
      .eq("workout_sets.concluida", true)
      .order("iniciado_em", { ascending: false });
    if (lastSetsError) throw lastSetsError;

    const lastSetsByExercise: Map<string, ReturnType<typeof mapSetRow>[]> = new Map();
    for (const w of lastSets ?? []) {
      const nested = w as unknown as {
        workout_sets: Database["public"]["Tables"]["workout_sets"]["Row"][];
      };
      for (const s of nested.workout_sets ?? []) {
        const mapped = mapSetRow(s);
        if (!lastSetsByExercise.has(mapped.exerciseId)) {
          lastSetsByExercise.set(mapped.exerciseId, []);
        }
        lastSetsByExercise.get(mapped.exerciseId)!.push(mapped);
      }
    }

    const result: Record<string, ProgressionSuggestion> = {};
    for (const re of routine.exercicios) {
      const exercise = exerciseById.get(re.exerciseId);
      if (!exercise) continue;
      const anteriores: PrevSet[] = (lastSetsByExercise.get(re.exerciseId) ?? []).map((s) => ({
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
      if (sugestao?.aumentou) {
        result[re.exerciseId] = sugestao;
      }
    }
    return result;
  });
