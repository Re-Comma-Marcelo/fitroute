import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { exercises as mockExercises } from "@/lib/data/mocks";
import { encodeBridgeCode, type RoutinePayload } from "@/lib/claude-bridge";
import { dbModule, requireMcpUser } from "../db";

export default defineTool({
  name: "create_routine",
  title: "Create a workout routine",
  description:
    "Creates or updates a workout routine directly in the connected user's app (upsert by name), and also returns an import code as a fallback. Call get_training_context first for valid exerciseId values.",
  inputSchema: {
    name: z.string().min(1).max(60).describe("Routine name, e.g. 'Upper A'."),
    description: z.string().max(200).default("").describe("One line on the intent of the routine."),
    exercises: z
      .array(
        z.object({
          exerciseId: z.string().min(1).describe("id from get_training_context."),
          sets: z.number().int().min(1).max(10),
          repsMin: z.number().int().min(1).max(50),
          repsMax: z.number().int().min(1).max(50),
          restSec: z.number().int().min(15).max(600),
          notes: z.string().max(200).default(""),
        }),
      )
      .min(1)
      .max(15)
      .describe("Exercises in the order they should be performed."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    // Writes require the caller to be the authenticated app user.
    const userId = await requireMcpUser(ctx);
    const { db, uid, unwrap } = await dbModule();
    const client = db();

    const bad = input.exercises.find((e) => e.repsMax < e.repsMin);
    if (bad) {
      return {
        content: [{ type: "text", text: "repsMax must be greater than or equal to repsMin." }],
        isError: true,
      };
    }

    const ids = [...new Set(input.exercises.map((e) => e.exerciseId))];
    const known = await client
      .from("exercises")
      .select("id, nome, user_id")
      .in("id", ids)
      .or(`user_id.is.null,user_id.eq.${userId}`);
    const dbRows = (known.data ?? []) as { id: string; nome: string }[];
    const nameOf = (id: string) =>
      dbRows.find((r) => r.id === id)?.nome ?? mockExercises.find((x) => x.id === id)?.nome ?? id;
    const unknown = ids.filter(
      (id) => !dbRows.some((r) => r.id === id) && !mockExercises.some((x) => x.id === id),
    );
    if (unknown.length) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown exerciseId: ${unknown.join(", ")}. Call get_training_context and use only ids from that library.`,
          },
        ],
        isError: true,
      };
    }

    const payload: RoutinePayload = {
      kind: "routine",
      name: input.name,
      description: input.description ?? "",
      exercises: input.exercises.map((e) => ({ ...e, notes: e.notes ?? "" })),
    };
    const code = encodeBridgeCode(payload);

    // Idempotent by name, scoped to this user.
    const existing = await client
      .from("routines")
      .select("id")
      .eq("user_id", userId)
      .eq("nome", input.name)
      .maybeSingle();
    const updated = Boolean(existing.data?.id);
    const routineId = (existing.data?.id as string | undefined) ?? uid("r");

    unwrap(
      await client
        .from("routines")
        .upsert(
          {
            id: routineId,
            user_id: userId,
            nome: payload.name,
            descricao: payload.description,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select("id"),
    );
    unwrap(
      await client.from("routine_exercises").delete().eq("routine_id", routineId).select("id"),
    );
    unwrap(
      await client
        .from("routine_exercises")
        .insert(
          payload.exercises.map((e, i) => ({
            id: uid("rex"),
            routine_id: routineId,
            exercise_id: e.exerciseId,
            ordem: i,
            series_alvo: e.sets,
            reps_min: e.repsMin,
            reps_max: e.repsMax,
            descanso_seg: e.restSec,
            notas: e.notes,
          })),
        )
        .select("id"),
    );

    const lines = payload.exercises.map((e, i) => {
      const rest = `${Math.round(e.restSec / 60)}min`;
      return `${i + 1}. ${nameOf(e.exerciseId)} — ${e.sets} × ${e.repsMin}-${e.repsMax}, rest ${rest}${e.notes ? ` (${e.notes})` : ""}`;
    });

    const summary = [
      updated
        ? `Routine "${payload.name}" updated in your app (${payload.exercises.length} exercises) — it already existed, so it was replaced instead of duplicated.`
        : `Routine "${payload.name}" created in your app (${payload.exercises.length} exercises).`,
      payload.description ? payload.description : "",
      ...lines,
      "",
      "If you prefer to review it before it lands, this import code also works in Profile → Claude → Import:",
      code,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { saved: true, updated, routineId, code, routine: payload },
    };
  },
});
