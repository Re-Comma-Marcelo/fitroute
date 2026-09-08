import { createServerFn } from "@tanstack/react-start";

/** Coach-generated checkpoints for the user's main goal. */
export const generateCheckpoints = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      data as {
        context: unknown;
        goalDate: string;
        dates: string[];
        language: string;
      },
  )
  .handler(async ({ data }) => {
    const [{ generateJson, PlanAiError }, { z }] = await Promise.all([
      import("./plan/gateway.server"),
      import("zod"),
    ]);

    const schema = z.object({
      checkpoints: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          date: z.string(),
          metricKind: z.enum(["lift", "sessions", "weight", "none"]),
          exerciseId: z.string().optional(),
          value: z.number().optional(),
        }),
      ),
      summary: z.string(),
    });

    const prompt = [
      "You are a strength coach planning checkpoints on the way to one main goal.",
      "Return one checkpoint per given date, in order. Each must be measurable from",
      "training logs: a lift target in kg (metricKind 'lift' with exerciseId from the",
      "context best lifts), a monthly session count ('sessions'), or a body weight in kg",
      "('weight'). Keep progression realistic and safe (roughly 2-5% strength gain per",
      "month, 0.25-0.5 kg body weight change per week). Titles max 5 words.",
      `Write titles and descriptions in this language: ${data.language}.`,
      `Goal date: ${data.goalDate}`,
      `Checkpoint dates: ${data.dates.join(", ")}`,
      `User context: ${JSON.stringify(data.context)}`,
    ].join("\n");

    try {
      return { ok: true as const, ...(await generateJson(prompt, schema)) };
    } catch (error) {
      if (error instanceof PlanAiError) return { ok: false as const, error: error.message };
      throw error;
    }
  });

/** One calm sentence explaining why a checkpoint moved. */
export const explainAdjustment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) => data as { context: unknown; checkpoint: unknown; language: string },
  )
  .handler(async ({ data }) => {
    const [{ generateJson, PlanAiError }, { z }] = await Promise.all([
      import("./plan/gateway.server"),
      import("zod"),
    ]);
    const schema = z.object({ reason: z.string() });
    const prompt = [
      "A training checkpoint was not reached on time and has been moved later.",
      "Write ONE short, supportive sentence explaining why, referring to the user's real",
      "context (missed sessions, other sport load, fatigue). No blame, no exclamation marks.",
      `Language: ${data.language}`,
      `Checkpoint: ${JSON.stringify(data.checkpoint)}`,
      `Context: ${JSON.stringify(data.context)}`,
    ].join("\n");
    try {
      return { ok: true as const, ...(await generateJson(prompt, schema)) };
    } catch (error) {
      if (error instanceof PlanAiError) return { ok: false as const, error: error.message };
      throw error;
    }
  });
