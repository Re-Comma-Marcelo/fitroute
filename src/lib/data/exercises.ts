import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

const idSchema = z.object({ id: z.string().uuid() });

export const getExercise = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => idSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("exercises")
      .select("*")
      .eq("id", data.id)
      .or(`user_id.is.null, user_id.eq.${context.userId}`)
      .maybeSingle();
    if (error) throw error;
    return row ? mapExercise(row) : null;
  });

export const getMuscleGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exercises")
      .select("grupo_primario");
    if (error) throw error;
    return [...new Set((data ?? []).map((e) => e.grupo_primario))].sort();
  });

export const getEquipments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exercises")
      .select("equipamento");
    if (error) throw error;
    return [...new Set((data ?? []).map((e) => e.equipamento))].sort();
  });

const exerciseInputSchema = z.object({
  nome: z.string().min(1),
  grupoPrimario: z.string().min(1),
  gruposSecundarios: z.array(z.string()),
  equipamento: z.string().min(1),
  instrucoes: z.string(),
  midiaUrl: z.string().optional(),
});

export const createExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => exerciseInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    const row: Database["public"]["Tables"]["exercises"]["Insert"] = {
      user_id: context.userId,
      nome: data.nome,
      grupo_primario: data.grupoPrimario,
      grupos_secundarios: data.gruposSecundarios,
      equipamento: data.equipamento,
      instrucoes: data.instrucoes,
      midia_url: data.midiaUrl ?? null,
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
