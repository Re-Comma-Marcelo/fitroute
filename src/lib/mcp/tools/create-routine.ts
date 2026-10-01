import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { exercises as mockExercises } from "@/lib/data/mocks";
import { encodeBridgeCode, swapReasonSchema, type RoutinePayload } from "@/lib/claude-bridge";
import { dbModule, requireMcpUser } from "../db";

export default defineTool({
  name: "create_routine",
  title: "Create a workout routine",
  description:
    "Creates or updates a workout routine directly in the connected user's app (upsert by name), and also returns an import code as a fallback. New routines land in the user's current training folder. Use role 'variation' (with variationOf and reason) for a lighter/shorter/social version of a standard routine; variations are kept in the folder but never scheduled or recommended on their own. Call get_training_context first for valid exerciseId values and the folder's routines.",
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
    role: z
      .enum(["standard", "variation"])
      .optional()
      .describe(
        "'standard' (default for new routines) is part of the plan; 'variation' is an alternative kept for days when life gets in the way. Omit when updating to keep the routine's current role.",
      ),
    variationOf: z
      .string()
      .min(1)
      .max(60)
      .optional()
      .describe("Variation only: name or id of the standard routine it varies."),
    reason: swapReasonSchema
      .optional()
      .describe(
        "Variation only: busy (short on time), social (training with friends), pain, equipment (taken), difficulty or preference.",
      ),
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

    const variation = input.role === "variation";
    let parent: { id: string; nome: string } | null = null;
    if (variation && input.variationOf) {
      const target = input.variationOf.trim();
      const own = await client.from("routines").select("id, nome").eq("user_id", userId);
      parent =
        ((own.data ?? []) as { id: string; nome: string }[]).find(
          (r) => r.id === target || r.nome.toLowerCase() === target.toLowerCase(),
        ) ?? null;
      if (!parent) {
        return {
          content: [
            {
              type: "text",
              text: `No routine named "${target}" to vary. Use the name or id of one of the user's standard routines from get_training_context.`,
            },
          ],
          isError: true,
        };
      }
    }

    const payload: RoutinePayload = {
      kind: "routine",
      name: input.name,
      description: input.description ?? "",
      exercises: input.exercises.map((e) => ({ ...e, notes: e.notes ?? "" })),
      ...(variation
        ? {
            role: "variation" as const,
            ...(parent ? { variationOf: parent.nome } : {}),
            ...(input.reason ? { reason: input.reason } : {}),
          }
        : {}),
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

    const base = {
      id: routineId,
      user_id: userId,
      nome: payload.name,
      descricao: payload.description,
      updated_at: new Date().toISOString(),
    };
    // Folder columns come from the folders migration: a new routine lands in
    // the current folder, an existing one stays where it is.
    const { currentFolderId } = await dbModule();
    const folderId = updated ? null : await currentFolderId(userId);
    // The role is only written when given, or for a new routine (standard by
    // default): an update without it keeps a variation a variation.
    const setsRole = input.role !== undefined || !updated;
    const withFolder = {
      ...base,
      ...(folderId ? { folder_id: folderId } : {}),
      ...(setsRole
        ? {
            papel: variation ? "variacao" : "padrao",
            variacao_de: parent?.id ?? null,
            motivo: variation ? (input.reason ?? null) : null,
          }
        : {}),
      // A variation is never scheduled on its own.
      ...(variation ? { dias_semana: [] } : {}),
    };
    const saved = await client
      .from("routines")
      .upsert(withFolder, { onConflict: "id" })
      .select("id");
    if (saved.error) {
      unwrap(await client.from("routines").upsert(base, { onConflict: "id" }).select("id"));
    }
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
      variation
        ? `Saved as a variation${parent ? ` of "${parent.nome}"` : ""}${input.reason ? ` (${input.reason})` : ""}: it sits under Variations in the folder, not in the weekly plan.`
        : "",
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
      structuredContent: {
        saved: true,
        updated,
        routineId,
        ...(setsRole ? { role: variation ? "variation" : "standard" } : {}),
        code,
        routine: payload,
      },
    };
  },
});
