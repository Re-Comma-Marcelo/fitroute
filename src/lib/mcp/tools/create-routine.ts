import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { exercises } from "@/lib/data/mocks";
import { encodeBridgeCode, type RoutinePayload } from "@/lib/claude-bridge";

export default defineTool({
  name: "create_routine",
  title: "Create a workout routine",
  description:
    "Builds a Forja workout routine from library exercises and returns an import code plus a readable summary. Call get_training_context first for valid exerciseId values.",
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
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: (input) => {
    const unknown = input.exercises.filter((e) => !exercises.some((x) => x.id === e.exerciseId));
    if (unknown.length) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown exerciseId: ${unknown.map((u) => u.exerciseId).join(", ")}. Call get_training_context and use only ids from that library.`,
          },
        ],
        isError: true,
      };
    }
    const bad = input.exercises.find((e) => e.repsMax < e.repsMin);
    if (bad) {
      return {
        content: [{ type: "text", text: "repsMax must be greater than or equal to repsMin." }],
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

    const lines = payload.exercises.map((e, i) => {
      const ex = exercises.find((x) => x.id === e.exerciseId)!;
      const rest = `${Math.round(e.restSec / 60)}min`;
      return `${i + 1}. ${ex.nome} — ${e.sets} × ${e.repsMin}-${e.repsMax}, rest ${rest}${e.notes ? ` (${e.notes})` : ""}`;
    });

    const summary = [
      `${payload.name}${payload.description ? ` — ${payload.description}` : ""}`,
      ...lines,
      "",
      "Paste this code into Forja → Profile → Claude → Import:",
      code,
    ].join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { code, routine: payload },
    };
  },
});
