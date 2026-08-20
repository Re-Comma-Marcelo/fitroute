import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/lib/database.types";
import type { Workout, WorkoutSet } from "@/lib/types";

function mapWorkout(row: Database["public"]["Tables"]["workouts"]["Row"]): Workout {
  return {
    id: row.id,
    routineId: row.routine_id ?? undefined,
    iniciadoEm: row.iniciado_em,
    finalizadoEm: row.finalizado_em ?? undefined,
    duracaoSeg: row.duracao_seg,
    volumeTotalKg: Number(row.volume_total_kg),
    notas: row.notas,
    origem: row.origem as Workout["origem"],
  };
}

function mapWorkoutSet(row: Database["public"]["Tables"]["workout_sets"]["Row"]): WorkoutSet {
  return {
    id: row.id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id,
    ordemExercicio: row.ordem_exercicio,
    serieNum: row.serie_num,
    tipoSerie: row.tipo_serie as WorkoutSet["tipoSerie"],
    pesoKg: Number(row.peso_kg),
    reps: row.reps,
    rpe: row.rpe ?? undefined,
    concluida: row.concluida,
  };
}

export const getWorkouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workouts")
      .select("*")
      .eq("user_id", context.userId)
      .not("finalizado_em", "is", null)
      .order("iniciado_em", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapWorkout);
  });

export const getWorkout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { id } = data as { id: string };
    const { data: row, error } = await context.supabase
      .from("workouts")
      .select("*")
      .eq("id", id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return row ? mapWorkout(row) : null;
  });

export const getWorkoutSets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { workoutId } = data as { workoutId: string };
    const { data: rows, error } = await context.supabase
      .from("workout_sets")
      .select("*")
      .eq("workout_id", workoutId)
      .order("ordem_exercicio", { ascending: true })
      .order("serie_num", { ascending: true });
    if (error) throw error;
    return (rows ?? []).map(mapWorkoutSet);
  });

export const getExerciseHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { exerciseId } = data as { exerciseId: string };
    const { data: rows, error } = await context.supabase
      .from("workout_sets")
      .select("*, workouts!inner(iniciado_em)")
      .eq("exercise_id", exerciseId)
      .eq("concluida", true)
      .order("workouts(iniciado_em)", { ascending: true });
    if (error) throw error;

    return (rows ?? [])
      .sort(
        (a, b) =>
          (a.workouts as unknown as { iniciado_em: string }).iniciado_em.localeCompare(
            (b.workouts as unknown as { iniciado_em: string }).iniciado_em,
          ) || a.ordem_exercicio - b.ordem_exercicio || a.serie_num - b.serie_num,
      )
      .map(mapWorkoutSet);
  });

export const getLastSetsForExercise = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { exerciseId } = data as { exerciseId: string };
    const { data: rows, error } = await context.supabase
      .from("workouts")
      .select("id, iniciado_em, workout_sets(*)")
      .eq("user_id", context.userId)
      .not("finalizado_em", "is", null)
      .eq("workout_sets.exercise_id", exerciseId)
      .eq("workout_sets.concluida", true)
      .order("iniciado_em", { ascending: false })
      .limit(1);
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const nested = rows[0] as unknown as {
      workout_sets: Database["public"]["Tables"]["workout_sets"]["Row"][];
    };
    return (nested.workout_sets ?? [])
      .sort((a, b) => a.serie_num - b.serie_num)
      .map(mapWorkoutSet);
  });

export const getPersonalRecord = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { exerciseId } = data as { exerciseId: string };
    const { data, error } = await context.supabase
      .from("workout_sets")
      .select("peso_kg")
      .eq("exercise_id", exerciseId)
      .eq("concluida", true)
      .order("peso_kg", { ascending: false })
      .limit(1);
    if (error) throw error;
    return Number(data?.[0]?.peso_kg ?? 0);
  });

export const saveWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { workout, sets } = data as { workout: Workout; sets: WorkoutSet[] };
    const id = workout.id || crypto.randomUUID();

    const workoutRow: Database["public"]["Tables"]["workouts"]["Insert"] = {
      id,
      user_id: context.userId,
      routine_id: workout.routineId ?? null,
      iniciado_em: workout.iniciadoEm,
      finalizado_em: workout.finalizadoEm ?? null,
      duracao_seg: workout.duracaoSeg,
      volume_total_kg: workout.volumeTotalKg,
      notas: workout.notas,
      origem: workout.origem,
    };

    const { data: saved, error } = await context.supabase
      .from("workouts")
      .upsert(workoutRow)
      .select("*")
      .single();
    if (error) throw error;

    // Delete existing sets and re-insert
    await context.supabase.from("workout_sets").delete().eq("workout_id", id);

    const setRows: Database["public"]["Tables"]["workout_sets"]["Insert"][] = sets.map(
      (s, i) => ({
        workout_id: id,
        exercise_id: s.exerciseId,
        ordem_exercicio: s.ordemExercicio,
        serie_num: s.serieNum,
        tipo_serie: s.tipoSerie,
        peso_kg: s.pesoKg,
        reps: s.reps,
        rpe: s.rpe ?? null,
        concluida: s.concluida,
      }),
    );

    if (setRows.length > 0) {
      const { error: insertError } = await context.supabase
        .from("workout_sets")
        .insert(setRows);
      if (insertError) throw insertError;
    }

    return mapWorkout(saved);
  });

export const deleteWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { id } = data as { id: string };
    const { error } = await context.supabase
      .from("workouts")
      .delete()
      .eq("id", id)
      .eq("user_id", context.userId);
    if (error) throw error;
  });
