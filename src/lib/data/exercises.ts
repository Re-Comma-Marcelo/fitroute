import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/lib/database.types";
import type { Exercise } from "@/lib/types";

function mapExercise(row: Database["public"]["Tables"]["exercises"]["Row"]): Exercise {
  return {
    id: row.id,
    nome: row.nome,
    grupoPrimario: row.grupo_primario,
    gruposSecundarios: row.grupos_secundarios,
    equipamento: row.equipamento,
    instrucoes: row.instrucoes,
    midiaUrl: row.midia_url ?? undefined,
    isCustom: row.is_custom,
  };
}

export const getExercises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exercises")
      .select("*")
      .or(`user_id.is.null, user_id.eq.${context.userId}`)
      .order("nome");
    if (error) throw error;
    return (data ?? []).map(mapExercise);
  });

export const getExercise = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { id } = data as { id: string };
    const { data: row, error } = await context.supabase
      .from("exercises")
      .select("*")
      .eq("id", id)
      .or(`user_id.is.null, user_id.eq.${context.userId}`)
      .maybeSingle();
    if (error) throw error;
    return row ? mapExercise(row) : null;
  });

export const getMuscleGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("exercises").select("grupo_primario");
    if (error) throw error;
    return [...new Set((data ?? []).map((e) => e.grupo_primario))].sort();
  });

export const getEquipments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("exercises").select("equipamento");
    if (error) throw error;
    return [...new Set((data ?? []).map((e) => e.equipamento))].sort();
  });

export const createExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const input = data as Omit<Exercise, "id" | "isCustom">;
    const row: Database["public"]["Tables"]["exercises"]["Insert"] = {
      user_id: context.userId,
      nome: input.nome,
      grupo_primario: input.grupoPrimario,
      grupos_secundarios: input.gruposSecundarios,
      equipamento: input.equipamento,
      instrucoes: input.instrucoes,
      midia_url: input.midiaUrl ?? null,
      is_custom: true,
    };
    const { data: saved, error } = await context.supabase
      .from("exercises")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return mapExercise(saved);
  });
