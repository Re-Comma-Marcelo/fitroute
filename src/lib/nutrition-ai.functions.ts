import { createServerFn } from "@tanstack/react-start";

export type EstimatedMeal = {
  name: string;
  slots: string[];
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepMin: number;
  tags: string[];
  ingredients: { name: string; qty: number; unit: string; aisle: string }[];
  confidence: "low" | "medium" | "high";
  note?: string;
};

type Result = { ok: true; meal: EstimatedMeal } | { ok: false; error: string };

async function estimate(prompt: string, imageDataUrl?: string): Promise<Result> {
  const [{ generateJson, PlanAiError }, { estimatedMealSchema, mealEstimatePrompt }] =
    await Promise.all([import("./plan/gateway.server"), import("./nutrition-ai.server")]);
  try {
    const meal = await generateJson(mealEstimatePrompt(prompt), estimatedMealSchema, imageDataUrl);
    return { ok: true, meal: meal as EstimatedMeal };
  } catch (error) {
    if (error instanceof PlanAiError) return { ok: false, error: error.message };
    return { ok: false, error: "Could not estimate this meal. Try again." };
  }
}

export const estimateMealFromText = createServerFn({ method: "POST" })
  .inputValidator((data: { description: string }) => data)
  .handler(async ({ data }): Promise<Result> => {
    const description = (data.description ?? "").trim().slice(0, 1200);
    if (description.length < 3) return { ok: false, error: "Describe the meal first." };
    return estimate(`The user described the meal in their own words:\n"""${description}"""`);
  });

export const estimateMealFromPhoto = createServerFn({ method: "POST" })
  .inputValidator((data: { imageDataUrl: string; note?: string }) => data)
  .handler(async ({ data }): Promise<Result> => {
    const image = data.imageDataUrl ?? "";
    if (!image.startsWith("data:image/")) return { ok: false, error: "Pick a photo first." };
    if (image.length > 8_000_000) return { ok: false, error: "That photo is too large." };
    const note = (data.note ?? "").trim().slice(0, 500);
    return estimate(
      `The user photographed the plate. Identify the foods and estimate portion sizes from the image.${
        note ? `\nExtra context from the user: """${note}"""` : ""
      }`,
      image,
    );
  });
