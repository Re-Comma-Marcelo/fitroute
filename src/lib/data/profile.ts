import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/lib/database.types";
import type { Profile } from "@/lib/types";

function mapProfile(row: Database["public"]["Tables"]["profiles"]["Row"]): Profile {
  return {
    id: row.id,
    nome: row.nome,
    pesoKg: Number(row.peso_kg),
    alturaCm: row.altura_cm,
    sexo: row.sexo as Profile["sexo"],
    nivelAtividade: row.nivel_atividade as Profile["nivelAtividade"],
    objetivo: row.objetivo as Profile["objetivo"],
    metaTreinosSemana: row.meta_treinos_semana,
  };
}

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const defaultProfile: Database["public"]["Tables"]["profiles"]["Insert"] = {
        id: context.userId,
        nome: "",
        peso_kg: 70,
        altura_cm: 170,
        sexo: "masculino",
        nivel_atividade: "moderado",
        objetivo: "hipertrofia",
        meta_treinos_semana: 4,
      };
      const { data: created, error: insertError } = await context.supabase
        .from("profiles")
        .insert(defaultProfile)
        .select("*")
        .single();
      if (insertError) throw insertError;
      return mapProfile(created);
    }

    return mapProfile(data);
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const next = data as Profile;
    const row: Database["public"]["Tables"]["profiles"]["Update"] = {
      nome: next.nome,
      peso_kg: next.pesoKg,
      altura_cm: next.alturaCm,
      sexo: next.sexo,
      nivel_atividade: next.nivelAtividade,
      objetivo: next.objetivo,
      meta_treinos_semana: next.metaTreinosSemana,
    };
    const { data: saved, error } = await context.supabase
      .from("profiles")
      .update(row)
      .eq("id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return mapProfile(saved);
  });
