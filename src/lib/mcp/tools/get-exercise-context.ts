import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { exercises as mockExercises } from "@/lib/data/mocks";
import { dbModule, optionalMcpUser } from "../db";

type ExerciseRow = {
  id: string;
  nome: string;
  grupo_primario: string;
  grupos_secundarios: string[] | null;
  equipamento: string;
  instrucoes: string | null;
};

const COLUMNS = "id, nome, grupo_primario, grupos_secundarios, equipamento, instrucoes";

type SetRow = {
  exercise_id: string;
  peso_kg: number | null;
  reps: number | null;
  rpe: number | null;
  concluida: boolean | null;
  workout_id: string;
};

export default defineTool({
  name: "get_exercise_context",
  title: "Get exercise context",
  description:
    "Read-only detail for one exercise: its muscle group, equipment, written instructions and, when the user is connected, their recent logged sets and heaviest set for it. Use it to answer form and progression questions about a specific movement.",
  inputSchema: {
    exerciseId: z
      .string()
      .min(1)
      .describe("Exercise id from get_training_context, e.g. 'ex-supino-reto'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ exerciseId }, ctx) => {
    const userId = await optionalMcpUser(ctx);

    const fallback = mockExercises.find((e) => e.id === exerciseId);
    let exercise = fallback
      ? {
          id: fallback.id,
          name: fallback.nome,
          muscleGroup: fallback.grupoPrimario,
          secondary: fallback.gruposSecundarios,
          equipment: fallback.equipamento,
          instructions: fallback.instrucoes,
        }
      : null;

    let recentSets: unknown[] = [];
    let bestSet: { weightKg: number; reps: number } | null = null;

    try {
      const { db } = await dbModule();
      const client = db();

      const row = await client.from("exercises").select(COLUMNS).eq("id", exerciseId).maybeSingle();
      if (!row.error && row.data) {
        const r = row.data as ExerciseRow;
        exercise = {
          id: r.id,
          name: r.nome,
          muscleGroup: r.grupo_primario,
          secondary: r.grupos_secundarios ?? [],
          equipment: r.equipamento,
          instructions: r.instrucoes ?? "",
        };
      }

      if (userId) {
        // Sets are reached through the caller's own workouts only.
        const workouts = await client
          .from("workouts")
          .select("id, iniciado_em")
          .eq("user_id", userId)
          .not("finalizado_em", "is", null)
          .order("iniciado_em", { ascending: false })
          .limit(12);

        const ids = (workouts.data ?? []).map((w) => (w as { id: string }).id);
        if (!workouts.error && ids.length) {
          const sets = await client
            .from("workout_sets")
            .select("exercise_id, peso_kg, reps, rpe, concluida, workout_id")
            .eq("exercise_id", exerciseId)
            .in("workout_id", ids);
          const rows = ((sets.data ?? []) as SetRow[]).filter((s) => s.concluida !== false);
          recentSets = rows.map((s) => ({
            workoutId: s.workout_id,
            weightKg: s.peso_kg,
            reps: s.reps,
            rpe: s.rpe,
          }));
          for (const s of rows) {
            const w = s.peso_kg ?? 0;
            if (!bestSet || w > bestSet.weightKg) bestSet = { weightKg: w, reps: s.reps ?? 0 };
          }
        }
      }
    } catch {
      // Database unreachable / not configured: keep the static catalog entry.
    }

    const payload = {
      authenticated: Boolean(userId),
      exercise,
      recentSets,
      bestSet,
      note: userId
        ? "recentSets and bestSet come from this user's own completed workouts."
        : "Not connected: only the shared catalog entry is available, with no personal history.",
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
