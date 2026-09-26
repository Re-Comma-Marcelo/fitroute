import { defineTool } from "@lovable.dev/mcp-js";
import { exercises as mockExercises } from "@/lib/data/mocks";
import { meals } from "@/lib/data/meals.mock";
import { dbModule, optionalMcpUser } from "../db";

type ExerciseRow = {
  id: string;
  nome: string;
  grupo_primario: string;
  grupos_secundarios: string[] | null;
  equipamento: string;
};

const EXERCISE_COLUMNS = "id, nome, grupo_primario, grupos_secundarios, equipamento";

const staticLibrary = () =>
  mockExercises.map((e) => ({
    id: e.id,
    name: e.nome,
    muscleGroup: e.grupoPrimario,
    secondary: e.gruposSecundarios,
    equipment: e.equipamento,
  }));

const mapExercise = (r: ExerciseRow) => ({
  id: r.id,
  name: r.nome,
  muscleGroup: r.grupo_primario,
  secondary: r.grupos_secundarios ?? [],
  equipment: r.equipamento,
});

export default defineTool({
  name: "get_training_context",
  title: "Get Route context",
  description:
    "Returns the exercise and meal libraries plus, when the user is connected, their profile, recent workouts, recent coach notes and current training folder (standard routines, variations and the swaps they keep making). Call this first — routines and diets may only use ids from here.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const userId = await optionalMcpUser(ctx);

    let library = staticLibrary();
    let profile: Record<string, unknown> | null = null;
    let recentWorkouts: unknown[] = [];
    let recentNotes: unknown[] = [];
    let trainingFolder: Record<string, unknown> | null = null;

    try {
      const { db } = await dbModule();
      const client = db();

      const shared = await client.from("exercises").select(EXERCISE_COLUMNS).is("user_id", null);
      const rows = (shared.data ?? []) as ExerciseRow[];
      if (!shared.error && rows.length) library = rows.map(mapExercise);

      if (userId) {
        const custom = await client
          .from("exercises")
          .select(EXERCISE_COLUMNS)
          .eq("user_id", userId);
        if (!custom.error && custom.data?.length) {
          library = [...library, ...(custom.data as ExerciseRow[]).map(mapExercise)];
        }

        const prof = await client
          .from("profiles")
          .select(
            "nome, peso_kg, altura_cm, sexo, objetivo, nivel_atividade, meta_treinos_semana, equipment, avoid_exercises, session_length_min, preferred_time, peso_meta_kg, idioma",
          )
          .eq("user_id", userId)
          .maybeSingle();
        if (!prof.error && prof.data) profile = prof.data as Record<string, unknown>;

        const workouts = await client
          .from("workouts")
          .select("id, routine_id, iniciado_em, duracao_seg, volume_total_kg, origem")
          .eq("user_id", userId)
          .not("finalizado_em", "is", null)
          .order("iniciado_em", { ascending: false })
          .limit(10);
        if (!workouts.error) recentWorkouts = workouts.data ?? [];

        const notes = await client
          .from("coach_notes")
          .select("kind, content, tags, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (!notes.error) recentNotes = notes.data ?? [];

        trainingFolder = await loadTrainingFolder(client, userId, library);
      }
    } catch {
      // Database unreachable / not configured: keep the static shared library.
    }

    const payload = {
      authenticated: Boolean(userId),
      note: userId
        ? "Connected: routines, diets and notes written by these tools land directly in the user's app."
        : "Not connected: only the shared libraries are available. Profile, workout history and coach notes require connecting the Route connector in Claude, and the write tools will refuse until then.",
      howToUse: [
        "Route is a strength-training + nutrition app.",
        "Use create_routine to build a workout routine, create_week_diet to plan meals and log_coach_note to record soreness/injuries or a weekly check-in. When the user is connected these write straight into the app (and still return an import code as a fallback).",
        "Only use exerciseId / mealId values from the libraries below. Respect anything in the profile's avoidExercises and available equipment, and only pick meals whose slots include the slot you are filling.",
        "Routines live in training folders (one block/cycle each). trainingFolder.standardRoutines is the plan; trainingFolder.variations are alternatives for short-on-time, social or pain days. commonSwaps shows which standard exercises the user keeps replacing, with what and why — prefer those substitutes, and suggest making a swap standard when it happens most sessions. To add an alternative, call create_routine with role 'variation', variationOf and reason.",
      ],
      profile: profile
        ? {
            name: profile["nome"],
            weightKg: profile["peso_kg"],
            heightCm: profile["altura_cm"],
            sex: profile["sexo"],
            goal: profile["objetivo"],
            activityLevel: profile["nivel_atividade"],
            weeklyTarget: profile["meta_treinos_semana"],
            equipment: profile["equipment"],
            avoidExercises: profile["avoid_exercises"],
            sessionLengthMin: profile["session_length_min"],
            preferredTime: profile["preferred_time"],
            goalWeightKg: profile["peso_meta_kg"],
            language: profile["idioma"],
          }
        : null,
      recentWorkouts,
      recentNotes,
      trainingFolder,
      exercises: library,
      meals: meals.map((m) => ({
        id: m.id,
        name: m.name,
        slots: m.slots,
        kcal: m.kcal,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
        prepMin: m.prepMin,
        tags: m.tags,
      })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});

type Library = ReturnType<typeof staticLibrary>;
type Client = ReturnType<Awaited<ReturnType<typeof dbModule>>["db"]>;

/**
 * The user's current folder: its standard routines (with exercise ids), its
 * variations, and the swaps made in its sessions. Null before the folders
 * migration or when there is no current folder.
 */
async function loadTrainingFolder(
  client: Client,
  userId: string,
  library: Library,
): Promise<Record<string, unknown> | null> {
  const folderRes = await client
    .from("training_folders")
    .select("id, nome, inicio_em")
    .eq("user_id", userId)
    .eq("status", "atual")
    .limit(1);
  const folder = (folderRes.data ?? [])[0] as
    { id: string; nome: string; inicio_em: string } | undefined;
  if (folderRes.error || !folder) return null;

  const routinesRes = await client
    .from("routines")
    .select("id, nome, papel, variacao_de, motivo")
    .eq("user_id", userId)
    .or(`folder_id.eq.${folder.id},folder_id.is.null`);
  const routines = (routinesRes.data ?? []) as {
    id: string;
    nome: string;
    papel: string | null;
    variacao_de: string | null;
    motivo: string | null;
  }[];
  const standard = routines.filter((r) => (r.papel ?? "padrao") === "padrao");
  const items = routines.length
    ? (((
        await client
          .from("routine_exercises")
          .select("routine_id, exercise_id, ordem")
          .in(
            "routine_id",
            routines.map((r) => r.id),
          )
          .order("ordem")
      ).data ?? []) as { routine_id: string; exercise_id: string }[])
    : [];
  const nameOfRoutine = (id: string | null) => routines.find((r) => r.id === id)?.nome ?? null;

  const workoutsRes = await client
    .from("workouts")
    .select("id, variacao, motivo")
    .eq("user_id", userId)
    .eq("folder_id", folder.id)
    .not("finalizado_em", "is", null)
    .order("iniciado_em", { ascending: false })
    .limit(40);
  const workouts = (workoutsRes.data ?? []) as {
    id: string;
    variacao: boolean | null;
    motivo: string | null;
  }[];
  const swapSets = workouts.length
    ? (((
        await client
          .from("workout_sets")
          .select("workout_id, exercise_id, substitui_exercise_id")
          .in(
            "workout_id",
            workouts.map((w) => w.id),
          )
          .not("substitui_exercise_id", "is", null)
      ).data ?? []) as { workout_id: string; exercise_id: string; substitui_exercise_id: string }[])
    : [];

  // One count per session per swap, with the reasons given for those sessions.
  const swaps = new Map<
    string,
    { from: string; to: string; sessions: Set<string>; reasons: string[] }
  >();
  for (const s of swapSets) {
    const key = `${s.substitui_exercise_id}>${s.exercise_id}`;
    const entry = swaps.get(key) ?? {
      from: s.substitui_exercise_id,
      to: s.exercise_id,
      sessions: new Set<string>(),
      reasons: [],
    };
    if (!entry.sessions.has(s.workout_id)) {
      entry.sessions.add(s.workout_id);
      const reason = workouts.find((w) => w.id === s.workout_id)?.motivo;
      if (reason) entry.reasons.push(reason);
    }
    swaps.set(key, entry);
  }
  const groupOf = (id: string) => library.find((e) => e.id === id)?.muscleGroup ?? null;

  return {
    name: folder.nome,
    since: folder.inicio_em,
    sessions: workouts.length,
    variationSessions: workouts.filter((w) => w.variacao).length,
    standardRoutines: standard.map((r) => ({
      id: r.id,
      name: r.nome,
      exerciseIds: items.filter((i) => i.routine_id === r.id).map((i) => i.exercise_id),
    })),
    variations: routines
      .filter((r) => r.papel === "variacao")
      .map((r) => ({
        id: r.id,
        name: r.nome,
        variationOf: nameOfRoutine(r.variacao_de),
        reason: r.motivo,
      })),
    commonSwaps: [...swaps.values()]
      .sort((a, b) => b.sessions.size - a.sessions.size)
      .slice(0, 10)
      .map((e) => ({
        from: e.from,
        to: e.to,
        muscleGroup: groupOf(e.from),
        sessions: e.sessions.size,
        reasons: [...new Set(e.reasons)],
      })),
  };
}
