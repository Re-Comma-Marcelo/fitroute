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
  title: "Get ROUTE context",
  description:
    "Returns the exercise and meal libraries plus, when the user is connected, their profile, recent workouts and recent coach notes. Call this first — routines and diets may only use ids from here.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const userId = await optionalMcpUser(ctx);

    let library = staticLibrary();
    let profile: Record<string, unknown> | null = null;
    let recentWorkouts: unknown[] = [];
    let recentNotes: unknown[] = [];

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
      }
    } catch {
      // Database unreachable / not configured: keep the static shared library.
    }

    const payload = {
      authenticated: Boolean(userId),
      note: userId
        ? "Connected: routines, diets and notes written by these tools land directly in the user's app."
        : "Not connected: only the shared libraries are available. Profile, workout history and coach notes require connecting the ROUTE connector in Claude, and the write tools will refuse until then.",
      howToUse: [
        "ROUTE is a strength-training + nutrition app.",
        "Use create_routine to build a workout routine, create_week_diet to plan meals and log_coach_note to record soreness/injuries or a weekly check-in. When the user is connected these write straight into the app (and still return an import code as a fallback).",
        "Only use exerciseId / mealId values from the libraries below. Respect anything in the profile's avoidExercises and available equipment, and only pick meals whose slots include the slot you are filling.",
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
