import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { encodeBridgeCode, type NotePayload } from "@/lib/claude-bridge";

export default defineTool({
  name: "log_coach_note",
  title: "Log a coach note",
  description:
    "Turns something the user reported (soreness, an injury, how the week went) into a Forja note code they can import. The app's coach then references it when planning sessions.",
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
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: (input) => {
    const payload: NotePayload = {
      kind: "note",
      noteKind: input.noteKind ?? "observation",
      content: input.content,
      tags: input.tags ?? [],
    };
    const code = encodeBridgeCode(payload);
    const summary = [
      `Note (${payload.noteKind}): ${payload.content}`,
      payload.tags.length ? `Tags: ${payload.tags.join(", ")}` : "",
      "",
      "Paste this code into Forja → Profile → Claude → Import:",
      code,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { code, note: payload },
    };
  },
});
