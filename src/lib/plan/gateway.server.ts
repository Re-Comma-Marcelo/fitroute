import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import type { z } from "zod";

const MODEL = "google/gemini-3.7-flash";

export class PlanAiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "PlanAiError";
  }
}

function provider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

function stripFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : trimmed) ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) return body;
  return body.slice(start, end + 1);
}

/**
 * One JSON generation against the Lovable AI Gateway. Streams on the wire (long
 * reasoning-style generations otherwise get severed) but resolves once.
 */
export async function generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new PlanAiError(401, "AI is not configured for this app yet.");
  }

  let text: string;
  try {
    const result = streamText({
      model: provider(apiKey)(MODEL),
      prompt,
      maxRetries: 1,
    });
    text = await result.text;
  } catch (error) {
    const status = Number(
      (error as { statusCode?: number; status?: number })?.statusCode ??
        (error as { status?: number })?.status ??
        0,
    );
    const message = (error as Error)?.message ?? "AI request failed.";
    if (status === 402)
      throw new PlanAiError(402, "The app's AI credits are used up. Ask the owner to top up.");
    if (status === 403) throw new PlanAiError(403, "AI access is blocked for this workspace.");
    if (status === 429)
      throw new PlanAiError(429, "The AI is busy right now — try again in a moment.");
    throw new PlanAiError(status || 500, message);
  }

  let json: unknown;
  try {
    json = JSON.parse(stripFence(text));
  } catch {
    throw new PlanAiError(422, "The AI returned something unreadable — try again.");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new PlanAiError(422, "The AI returned an incomplete plan — try again.");
  }
  return parsed.data;
}
