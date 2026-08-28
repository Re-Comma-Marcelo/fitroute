import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { encodeBridgeCode, type NotePayload } from "@/lib/claude-bridge";
import { dbModule, requireMcpUser } from "../db";

export default defineTool({
  name: "log_coach_note",
  title: "Log a coach note",
  description:
    "Records something the user reported (soreness, an injury, how the week went) directly in the connected user's app, so the in-app coach references it when planning sessions. Also returns an import code as a fallback.",
  inputSchema: {
    content: z
      .string()
      .min(3)
      .max(500)
      .describe("Plain language, first person, e.g. 'Left shoulder sore after pressing.'"),
    noteKind: z
      .enum(["checkin", "observation"])
      .default("observation")
      .describe("'checkin' for a weekly review, 'observation' for a one-off."),
    tags: z
      .array(z.string().max(30))
      .max(8)
      .default([])
      .describe("Short tags, e.g. ['shoulder', 'soreness'] — used to match exercises."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const userId = await requireMcpUser(ctx);
    const payload: NotePayload = {
      kind: "note",
      noteKind: input.noteKind ?? "observation",
      content: input.content,
      tags: input.tags ?? [],
    };
    const code = encodeBridgeCode(payload);

    const { db, uid, unwrap } = await dbModule();
    unwrap(
      await db()
        .from("coach_notes")
        .insert({
          id: uid("cn"),
          user_id: userId,
          kind: payload.noteKind,
          content: payload.content,
          tags: payload.tags,
        })
        .select("id"),
    );

    const summary = [
      `Note saved in your app (${payload.noteKind}): ${payload.content}`,
      payload.tags.length ? `Tags: ${payload.tags.join(", ")}` : "",
      "",
      "If you prefer to import it manually instead, this code works in Profile → Claude → Import:",
      code,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { saved: true, code, note: payload },
    };
  },
});
