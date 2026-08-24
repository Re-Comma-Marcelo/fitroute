import { z } from "zod";

/**
 * Shared contract between the app's MCP tools (what Claude produces) and the
 * Profile importer (what the app applies). Pure module — safe on both runtimes.
 */

export const CODE_PREFIX = "FORJA1.";

export const routineExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(10),
  repsMin: z.number().int().min(1).max(50),
  repsMax: z.number().int().min(1).max(50),
  restSec: z.number().int().min(15).max(600),
  notes: z.string().max(200).default(""),
});

export const routinePayloadSchema = z.object({
  kind: z.literal("routine"),
  name: z.string().min(1).max(60),
  description: z.string().max(200).default(""),
  exercises: z.array(routineExerciseSchema).min(1).max(15),
});

export const dietPayloadSchema = z.object({
  kind: z.literal("diet"),
  /** ISO date (yyyy-mm-dd) -> slot -> mealId */
  days: z.record(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.record(z.string().min(1), z.string().min(1)),
  ),
});

export const notePayloadSchema = z.object({
  kind: z.literal("note"),
  noteKind: z.enum(["checkin", "observation"]).default("observation"),
  content: z.string().min(3).max(500),
  tags: z.array(z.string().max(30)).max(8).default([]),
});

export const bridgePayloadSchema = z.discriminatedUnion("kind", [
  routinePayloadSchema,
  dietPayloadSchema,
  notePayloadSchema,
]);

export type RoutinePayload = z.infer<typeof routinePayloadSchema>;
export type DietPayload = z.infer<typeof dietPayloadSchema>;
export type NotePayload = z.infer<typeof notePayloadSchema>;
export type BridgePayload = z.infer<typeof bridgePayloadSchema>;

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeBridgeCode(payload: BridgePayload): string {
  return CODE_PREFIX + toBase64(JSON.stringify(payload));
}

/** Tolerant of surrounding chat text, quotes and line breaks. */
export function decodeBridgeCode(
  raw: string,
): { ok: true; payload: BridgePayload } | { ok: false; error: string } {
  const match = raw.match(new RegExp(`${CODE_PREFIX.replace(".", "\\.")}[A-Za-z0-9+/=\\s]+`));
  if (!match) {
    return { ok: false, error: `No Forja code found. It should start with ${CODE_PREFIX}` };
  }
  const body = match[0].slice(CODE_PREFIX.length).replace(/\s+/g, "");
  let json: unknown;
  try {
    json = JSON.parse(fromBase64(body));
  } catch {
    return { ok: false, error: "That code is damaged — copy the whole code from Claude again." };
  }
  const parsed = bridgePayloadSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Unsupported code contents." };
  }
  return { ok: true, payload: parsed.data };
}
