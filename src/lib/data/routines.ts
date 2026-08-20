import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/lib/database.types";
import type { Routine, RoutineExercise } from "@/lib/types";

function mapRoutineExercise(
  row: Database["public"]["Tables"]["routine_exercises"]["Row"],
): RoutineExercise {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    ordem: row.ordem,
    seriesAlvo: row.series_alvo,
    repsMin: row.reps_min,
    repsMax: row.reps_max,
    descansoSeg: row.descanso_seg,
    notas: row.notas,
  };
}

function mapRoutine(
  row: Database["public"]["Tables"]["routines"]["Row"],
  exercises: Database["public"]["Tables"]["routine_exercises"]["Row"][],
): Routine {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    exercicios: exercises
      .filter((e) => e.routine_id === row.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map(mapRoutineExercise),
  };
}

export const getRoutines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: routines, error: routinesError } = await context.supabase
      .from("routines")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (routinesError) throw routinesError;

    const routineIds = routines?.map((r) => r.id) ?? [];
    let exercises: Database["public"]["Tables"]["routine_exercises"]["Row"][] = [];
    if (routineIds.length > 0) {
      const { data, error } = await context.supabase
        .from("routine_exercises")
        .select("*")
        .in("routine_id", routineIds);
      if (error) throw error;
      exercises = data ?? [];
    }

    return (routines ?? []).map((r) => mapRoutine(r, exercises));
  });

export const getRoutine = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { id } = data as { id: string };
    const { data: routine, error } = await context.supabase
      .from("routines")
      .select("*")
      .eq("id", id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!routine) return null;

    const { data: exercises } = await context.supabase
      .from("routine_exercises")
      .select("*")
      .eq("routine_id", id)
      .order("ordem");

    return mapRoutine(routine, exercises ?? []);
  });

export const getRoutineLastWorkoutDate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { routineId } = data as { routineId: string };
    const { data: rows, error } = await context.supabase
      .from("workouts")
      .select("iniciado_em")
      .eq("user_id", context.userId)
      .eq("routine_id", routineId)
      .not("finalizado_em", "is", null)
      .order("iniciado_em", { ascending: false })
      .limit(1);
    if (error) throw error;
    return rows?.[0]?.iniciado_em ?? null;
  });

export const saveRoutine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const routine = data as Routine;
    const id = routine.id || crypto.randomUUID();

    const routineRow: Database["public"]["Tables"]["routines"]["Insert"] = {
      id,
      user_id: context.userId,
      nome: routine.nome,
      descricao: routine.descricao,
    };

    const { data: saved, error } = await context.supabase
      .from("routines")
      .upsert(routineRow)
      .select("*")
      .single();
    if (error) throw error;

    // Delete existing exercises and re-insert
    await context.supabase.from("routine_exercises").delete().eq("routine_id", id);

    const exerciseRows: Database["public"]["Tables"]["routine_exercises"]["Insert"][] =
      routine.exercicios.map((e, i) => ({
        routine_id: id,
        exercise_id: e.exerciseId,
        ordem: i,
        series_alvo: e.seriesAlvo,
        reps_min: e.repsMin,
        reps_max: e.repsMax,
        descanso_seg: e.descansoSeg,
        notas: e.notas,
      }));

    if (exerciseRows.length > 0) {
      const { error: insertError } = await context.supabase
        .from("routine_exercises")
        .insert(exerciseRows);
      if (insertError) throw insertError;
    }

    return { ...routine, id };
  });

export const deleteRoutine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { id } = data as { id: string };
    const { error } = await context.supabase
      .from("routines")
      .delete()
      .eq("id", id)
      .eq("user_id", context.userId);
    if (error) throw error;
  });

export function newRoutineExercise(exerciseId: string, ordem: number): RoutineExercise {
  return {
    id: crypto.randomUUID(),
    exerciseId,
    ordem,
    seriesAlvo: 3,
    repsMin: 8,
    repsMax: 12,
    descansoSeg: 90,
    notas: "",
  };
}

export const countRoutineSetsLogged = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { routineId } = data as { routineId: string };
    const { data: workouts, error } = await context.supabase
      .from("workouts")
      .select("id")
      .eq("user_id", context.userId)
      .eq("routine_id", routineId);
    if (error) throw error;
    if (workouts.length === 0) return 0;

    const { count, error: countError } = await context.supabase
      .from("workout_sets")
      .select("*", { count: "exact", head: true })
      .in(
        "workout_id",
        workouts.map((w) => w.id),
      );
    if (countError) throw countError;
    return count ?? 0;
  });
