/**
 * Server-only Supabase access for the external (self-owned) project.
 * Never import this from components — only from server-function handlers.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Profile } from "./types";

/**
 * Resolve the signed-in Supabase user from the request bearer token.
 * Every data handler scopes its rows to this id.
 */
export async function requireUserId(): Promise<string> {
  const header = getRequest()?.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) throw new Response("Unauthorized", { status: 401 });
  const token = header.slice("Bearer ".length);
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw new Response("Unauthorized", { status: 401 });
  return data.user.id;
}

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

/** True when PostgREST reports the table/relation is not in the schema cache. */
export function isMissingTable(error: { message?: string } | null): boolean {
  const m = error?.message ?? "";
  return /schema cache|does not exist|Could not find the table/i.test(m);
}

/** Like unwrap, but returns the fallback when the table has not been migrated yet. */
export function unwrapSoft<T>(
  res: { data: T | null; error: { message: string } | null },
  fallback: T,
): T {
  if (res.error) {
    if (isMissingTable(res.error)) return fallback;
    throw new Error(res.error.message);
  }
  return (res.data ?? fallback) as T;
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
  idioma: (r["idioma"] ?? "en") as string,
  avatarUrl: (r["avatar_url"] ?? undefined) as string | undefined,
  pesoInicialKg: r["peso_inicial_kg"] == null ? undefined : Number(r["peso_inicial_kg"]),
  pesoMetaKg: r["peso_meta_kg"] == null ? undefined : Number(r["peso_meta_kg"]),
  metaIniciadaEm: (r["meta_iniciada_em"] ?? undefined) as string | undefined,
  metaPrazo: (r["meta_prazo"] ?? undefined) as string | undefined,
  onboardingConcluidoEm: (r["onboarding_concluido_em"] ?? undefined) as string | undefined,
  idade: r["idade"] == null ? undefined : Number(r["idade"]),
  metaKcal: r["meta_kcal"] == null ? undefined : Number(r["meta_kcal"]),
  metaProteinaG: r["meta_proteina_g"] == null ? undefined : Number(r["meta_proteina_g"]),
  trainingGoal: (r["training_goal"] ?? undefined) as Profile["trainingGoal"],
});

export const fromProfile = (p: Row, userId: string) => ({
  id: p["id"] ?? userId,
  user_id: userId,
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
  idioma: p["idioma"] ?? "en",
  avatar_url: p["avatarUrl"] || null,
  peso_inicial_kg: p["pesoInicialKg"] ?? null,
  peso_meta_kg: p["pesoMetaKg"] ?? null,
  meta_iniciada_em: p["metaIniciadaEm"] ?? null,
  meta_prazo: p["metaPrazo"] ?? null,
  onboarding_concluido_em: p["onboardingConcluidoEm"] ?? null,
  idade: p["idade"] ?? null,
  meta_kcal: p["metaKcal"] ?? null,
  meta_proteina_g: p["metaProteinaG"] ?? null,
  training_goal: p["trainingGoal"] ?? null,
});

export const toExercise = (r: Row) => ({
  id: String(r["id"]),
  nome: String(r["nome"]),
  grupoPrimario: String(r["grupo_primario"]),
  gruposSecundarios: (r["grupos_secundarios"] ?? []) as string[],
  equipamento: String(r["equipamento"]),
  instrucoes: String(r["instrucoes"] ?? ""),
  midiaUrl: (r["midia_url"] ?? undefined) as string | undefined,
  variants: Array.isArray(r["variants"])
    ? (r["variants"] as { id: string; label: string; instrucoes?: string }[])
    : undefined,
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
  folderId: (r["folder_id"] ?? undefined) as string | undefined,
  variacao: Boolean(r["variacao"]),
  motivo: (r["motivo"] ?? undefined) as string | undefined,
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
  coachNote: String(r["coach_note"] ?? ""),
  substituiExerciseId: (r["substitui_exercise_id"] ?? undefined) as string | undefined,
  variantId: (r["variant_id"] ?? undefined) as string | undefined,
});

export const toFolder = (r: Row) => ({
  id: String(r["id"]),
  nome: String(r["nome"] ?? ""),
  status: (r["status"] ?? "atual") as string,
  origemModeloId: (r["origem_modelo_id"] ?? undefined) as string | undefined,
  inicioEm: String(r["inicio_em"] ?? r["created_at"] ?? ""),
  fimEm: (r["fim_em"] ?? undefined) as string | undefined,
});

/** The user's current folder id, or null before the folders migration / first folder. */
export async function currentFolderId(userId: string): Promise<string | null> {
  const res = await db()
    .from("training_folders")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "atual")
    .limit(1);
  if (res.error) return null;
  const row = (res.data ?? [])[0] as Row | undefined;
  return row ? String(row["id"]) : null;
}

export const toCoachNote = (r: Row) => ({
  id: String(r["id"]),
  createdAt: String(r["created_at"]),
  kind: (r["kind"] ?? "observation") as string,
  content: String(r["content"] ?? ""),
  tags: (r["tags"] ?? []) as string[],
});

export const toCoachingEvent = (r: Row) => ({
  id: String(r["id"]),
  createdAt: String(r["created_at"]),
  kind: String(r["kind"]),
  exerciseId: (r["exercise_id"] ?? undefined) as string | undefined,
  workoutId: (r["workout_id"] ?? undefined) as string | undefined,
  cause: (r["cause"] ?? undefined) as string | undefined,
  detail: (r["detail"] ?? {}) as Record<string, string | number | boolean | null>,
  message: String(r["message"] ?? ""),
  userReply: (r["user_reply"] ?? undefined) as string | undefined,
});

export const toCrossTraining = (r: Row) => ({
  id: String(r["id"]),
  kind: String(r["kind"]),
  data: String(r["data"]),
  duracaoMin: Number(r["duracao_min"] ?? 0),
  intensidade: String(r["intensidade"] ?? "moderate"),
  nota: String(r["nota"] ?? ""),
  distanciaKm: r["distancia_km"] == null ? undefined : Number(r["distancia_km"]),
});

export const toChatEntry = (r: Row) => ({
  id: String(r["id"]),
  createdAt: String(r["created_at"]),
  role: String(r["role"]),
  content: String(r["content"] ?? ""),
  workoutId: (r["workout_id"] ?? undefined) as string | undefined,
  exerciseId: (r["exercise_id"] ?? undefined) as string | undefined,
});

export const toCustomMeal = (r: Row) => ({
  id: String(r["id"]),
  name: String(r["nome"] ?? ""),
  slots: (r["slots"] ?? []) as string[],
  kcal: Number(r["kcal"] ?? 0),
  proteinG: Number(r["protein_g"] ?? 0),
  carbsG: Number(r["carbs_g"] ?? 0),
  fatG: Number(r["fat_g"] ?? 0),
  prepMin: Number(r["prep_min"] ?? 0),
  tags: (r["tags"] ?? []) as string[],
  ingredients: (r["ingredients"] ?? []) as {
    name: string;
    qty: number;
    unit: string;
    aisle: string;
  }[],
  orderOut: Boolean(r["order_out"]),
  custom: true as const,
  source: (r["source"] ?? "text") as string,
});
