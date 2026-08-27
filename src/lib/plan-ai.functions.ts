import { createServerFn } from "@tanstack/react-start";

export const translateGoal = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { intake: unknown })
  .handler(async ({ data }) => {
    const [{ generateJson, PlanAiError }, { goalPrompt }, { goalTranslationSchema }] = await Promise.all([
      import("./plan/gateway.server"),
      import("./plan/prompt"),
      import("./plan/schema"),
    ]);
    try {
      const intake = data.intake as Parameters<typeof goalPrompt>[0];
      return { ok: true as const, goal: await generateJson(goalPrompt(intake), goalTranslationSchema) };
    } catch (error) {
      if (error instanceof PlanAiError) return { ok: false as const, error: error.message };
      throw error;
    }
  });

export const generatePlan = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { intake: unknown; goal: unknown; feedback?: string; previous?: unknown })
  .handler(async ({ data }) => {
    const [{ generateJson, PlanAiError }, { planPrompt }, { generatedPlanSchema }] = await Promise.all([
      import("./plan/gateway.server"),
      import("./plan/prompt"),
      import("./plan/schema"),
    ]);
    try {
      const plan = await generateJson(
        planPrompt(
          data.intake as Parameters<typeof planPrompt>[0],
          (data.goal ?? null) as Parameters<typeof planPrompt>[1],
          data.feedback ?? "",
          (data.previous ?? null) as Parameters<typeof planPrompt>[3],
        ),
        generatedPlanSchema,
      );
      return { ok: true as const, plan };
    } catch (error) {
      if (error instanceof PlanAiError) return { ok: false as const, error: error.message };
      throw error;
    }
  });

export const parsePlanImport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { raw: string })
  .handler(async ({ data }) => {
    const [{ generateJson, PlanAiError }, { importPrompt }, { parsedImportSchema }] = await Promise.all([
      import("./plan/gateway.server"),
      import("./plan/prompt"),
      import("./plan/schema"),
    ]);
    try {
      return { ok: true as const, parsed: await generateJson(importPrompt(data.raw), parsedImportSchema) };
    } catch (error) {
      if (error instanceof PlanAiError) return { ok: false as const, error: error.message };
      throw error;
    }
  });
