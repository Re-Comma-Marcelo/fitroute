/**
 * Server-only Supabase access for the external (self-owned) project.
 * Never import this from components — only from server-function handlers.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Single fixed user while the app runs with open access (no login). */
export const DEMO_USER_ID = "demo";

let cached: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (cached) return cached;
  const raw = process.env["FORJA_SUPABASE_URL"];
  const key = process.env["FORJA_SUPABASE_SERVICE_ROLE_KEY"];
  if (!raw || !key) {
    throw new Error(
      "Supabase is not configured: FORJA_SUPABASE_URL / FORJA_SUPABASE_SERVICE_ROLE_KEY are missing.",
    );
  }
  // Accept both https://x.supabase.co and .../rest/v1 pasted by hand.
  const url = raw.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        // sb_secret_* keys are opaque, not JWTs — send them as apikey only.
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input as RequestInfo, { ...init, headers: h });
      },
    },
  });
  return cached;
}

export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---- row <-> app mappers ---------------------------------------------------

type Row = Record<string, unknown>;

export const toProfile = (r: Row) => ({
  id: String(r["id"]),
  nome: String(r["nome"] ?? ""),
  pesoKg: Number(r["peso_kg"] ?? 70),
  alturaCm: Number(r["altura_cm"] ?? 170),
  sexo: r["sexo"],
  nivelAtividade: r["nivel_atividade"],
  objetivo: r["objetivo"],
  metaTreinosSemana: Number(r["meta_treinos_semana"] ?? 4),
  equipment: (r["equipment"] ?? []) as string[],
  avoidExercises: (r["avoid_exercises"] ?? []) as unknown[],
  sessionLengthMin: Number(r["session_length_min"] ?? 60),
  preferredTime: r["preferred_time"],
  checkInMode: r["check_in_mode"],
  pesoInicialKg: r["peso_inicial_kg"] == null ? undefined : Number(r["peso_inicial_kg"]),
  pesoMetaKg: r["peso_meta_kg"] == null ? undefined : Number(r["peso_meta_kg"]),
  metaIniciadaEm: (r["meta_iniciada_em"] ?? undefined) as string | undefined,
  metaPrazo: (r["meta_prazo"] ?? undefined) as string | undefined,
});

export const fromProfile = (p: Row) => ({
  id: p["id"],
  user_id: DEMO_USER_ID,
  nome: p["nome"],
  peso_kg: p["pesoKg"],
  altura_cm: p["alturaCm"],
  sexo: p["sexo"],
  nivel_atividade: p["nivelAtividade"],
  objetivo: p["objetivo"],
  meta_treinos_semana: p["metaTreinosSemana"],
  equipment: p["equipment"] ?? [],
  avoid_exercises: p["avoidExercises"] ?? [],
  session_length_min: p["sessionLengthMin"],
  preferred_time: p["preferredTime"],
  check_in_mode: p["checkInMode"],
  peso_inicial_kg: p["pesoInicialKg"] ?? null,
  peso_meta_kg: p["pesoMetaKg"] ?? null,
  meta_iniciada_em: p["metaIniciadaEm"] ?? null,
  meta_prazo: p["metaPrazo"] ?? null,
});

export const toExercise = (r: Row) => ({
  id: String(r["id"]),
  nome: String(r["nome"]),
  grupoPrimario: String(r["grupo_primario"]),
  gruposSecundarios: (r["grupos_secundarios"] ?? []) as string[],
  equipamento: String(r["equipamento"]),
  instrucoes: String(r["instrucoes"] ?? ""),
  midiaUrl: (r["midia_url"] ?? undefined) as string | undefined,
  isCustom: Boolean(r["is_custom"]),
});

export const toRoutineExercise = (r: Row) => ({
  id: String(r["id"]),
  exerciseId: String(r["exercise_id"]),
  ordem: Number(r["ordem"] ?? 0),
  seriesAlvo: Number(r["series_alvo"] ?? 3),
  repsMin: Number(r["reps_min"] ?? 8),
  repsMax: Number(r["reps_max"] ?? 12),
  descansoSeg: Number(r["descanso_seg"] ?? 90),
  notas: String(r["notas"] ?? ""),
});

export const toWorkout = (r: Row) => ({
  id: String(r["id"]),
  routineId: (r["routine_id"] ?? undefined) as string | undefined,
  iniciadoEm: String(r["iniciado_em"]),
  finalizadoEm: (r["finalizado_em"] ?? undefined) as string | undefined,
  duracaoSeg: Number(r["duracao_seg"] ?? 0),
  volumeTotalKg: Number(r["volume_total_kg"] ?? 0),
  notas: String(r["notas"] ?? ""),
  origem: (r["origem"] ?? "rotina") as string,
});

export const toSet = (r: Row) => ({
  id: String(r["id"]),
  workoutId: String(r["workout_id"]),
  exerciseId: String(r["exercise_id"]),
  ordemExercicio: Number(r["ordem_exercicio"] ?? 0),
  serieNum: Number(r["serie_num"] ?? 1),
  tipoSerie: (r["tipo_serie"] ?? "normal") as string,
  pesoKg: Number(r["peso_kg"] ?? 0),
  reps: Number(r["reps"] ?? 0),
  rpe: r["rpe"] == null ? undefined : Number(r["rpe"]),
  concluida: Boolean(r["concluida"]),
});

export const toCoachNote = (r: Row) => ({
  id: String(r["id"]),
  createdAt: String(r["created_at"]),
  kind: (r["kind"] ?? "observation") as string,
  content: String(r["content"] ?? ""),
  tags: (r["tags"] ?? []) as string[],
});
