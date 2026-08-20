import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

const idSchema = z.object({ id: z.string().uuid() });
const workoutIdSchema = z.object({ workoutId: z.string().uuid() });
const exerciseIdSchema = z.object({ exerciseId: z.string().uuid() });

export const getWorkout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => idSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("workouts")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return row ? mapWorkout(row) : null;
  });

export const getWorkoutSets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => workoutIdSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("workout_sets")
      .select("*")
      .eq("workout_id", data.workoutId)
      .order("ordem_exercicio", { ascending: true })
      .order("serie_num", { ascending: true });
    if (error) throw error;
    return (rows ?? []).map(mapWorkoutSet);
  });

export const getExerciseHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => exerciseIdSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("workout_sets")
      .select("*, workouts!inner(iniciado_em)")
      .eq("exercise_id", data.exerciseId)
      .eq("concluida", true)
      .order("workouts(iniciado_em)", { ascending: true });
    if (error) throw error;

    return (rows ?? [])
      .sort(
        (a, b) =>
          String(a.workouts?.iniciado_em ?? "").localeCompare(
            String(b.workouts?.iniciado_em ?? ""),
          ) ||
          a.ordem_exercicio - b.ordem_exercicio ||
          a.serie_num - b.serie_num,
      )
      .map(mapWorkoutSet);
  });

export const getLastSetsForExercise = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => exerciseIdSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("workouts")
      .select("id, iniciado_em, workout_sets(*)")
      .eq("user_id", context.userId)
      .not("finalizado_em", "is", null)
      .eq("workout_sets.exercise_id", data.exerciseId)
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
  .validator((input) => exerciseIdSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("workout_sets")
      .select("peso_kg")
      .eq("exercise_id", data.exerciseId)
      .eq("concluida", true)
      .order("peso_kg", { ascending: false })
      .limit(1);
    if (error) throw error;
    return Number(rows?.[0]?.peso_kg ?? 0);
  });

const workoutSchema = z.object({
  id: z.string().uuid(),
  routineId: z.string().uuid().optional(),
  iniciadoEm: z.string(),
  finalizadoEm: z.string().optional(),
  duracaoSeg: z.number().int(),
  volumeTotalKg: z.number(),
  notas: z.string(),
  origem: z.enum(["rotina", "branco"]),
});

const workoutSetSchema = z.object({
  id: z.string().uuid(),
  workoutId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  ordemExercicio: z.number().int(),
  serieNum: z.number().int(),
  tipoSerie: z.enum(["aquecimento", "normal", "falha", "drop"]),
  pesoKg: z.number(),
  reps: z.number().int(),
  rpe: z.number().optional(),
  concluida: z.boolean(),
});

const saveWorkoutSchema = z.object({
  workout: workoutSchema,
  sets: z.array(workoutSetSchema),
});

export const saveWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => saveWorkoutSchema.parse(input))
  .handler(async ({ context, data }) => {
    const id = data.workout.id || crypto.randomUUID();

    const workoutRow: Database["public"]["Tables"]["workouts"]["Insert"] = {
      id,
      user_id: context.userId,
      routine_id: data.workout.routineId ?? null,
      iniciado_em: data.workout.iniciadoEm,
      finalizado_em: data.workout.finalizadoEm ?? null,
      duracao_seg: data.workout.duracaoSeg,
      volume_total_kg: data.workout.volumeTotalKg,
      notas: data.workout.notas,
      origem: data.workout.origem,
    };

    const { data: saved, error } = await context.supabase
      .from("workouts")
      .upsert(workoutRow)
      .select("*")
      .single();
    if (error) throw error;

    // Delete existing sets and re-insert
    await context.supabase.from("workout_sets").delete().eq("workout_id", id);

    const setRows: Database["public"]["Tables"]["workout_sets"]["Insert"][] = data.sets.map(
      (s) => ({
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
  .validator((input) => idSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("workouts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
  });
