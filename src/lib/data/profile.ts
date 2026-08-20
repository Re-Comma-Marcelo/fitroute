import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

const profileSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  pesoKg: z.number(),
  alturaCm: z.number(),
  sexo: z.enum(["masculino", "feminino", "outro"]),
  nivelAtividade: z.enum(["sedentario", "leve", "moderado", "intenso", "atleta"]),
  objetivo: z.enum(["cutting", "manutencao", "bulking"]),
  metaTreinosSemana: z.number().int(),
});

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => profileSchema.parse(input))
  .handler(async ({ context, data }) => {
    const row: Database["public"]["Tables"]["profiles"]["Update"] = {
      nome: data.nome,
      peso_kg: data.pesoKg,
      altura_cm: data.alturaCm,
      sexo: data.sexo,
      nivel_atividade: data.nivelAtividade,
      objetivo: data.objetivo,
      meta_treinos_semana: data.metaTreinosSemana,
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
