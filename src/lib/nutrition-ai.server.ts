import { z } from "zod";

export const estimatedMealSchema = z.object({
  name: z.string().min(2).max(80),
  slots: z.array(z.enum(["breakfast", "lunch", "snack", "dinner"])).min(1),
  kcal: z.number().min(0).max(4000),
  proteinG: z.number().min(0).max(400),
  carbsG: z.number().min(0).max(600),
  fatG: z.number().min(0).max(300),
  prepMin: z.number().min(0).max(240),
  tags: z.array(z.enum(["high-protein", "high-carb", "light", "order-out", "quick"])).default([]),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        qty: z.number().min(0).max(5000),
        unit: z.string().min(1).max(12),
        aisle: z.enum(["Produce", "Protein", "Pantry", "Dairy", "Frozen", "Bakery"]),
      }),
    )
    .default([]),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  note: z.string().max(200).optional(),
});

export type EstimatedMealParsed = z.infer<typeof estimatedMealSchema>;

/** Wraps the user's input in a nutrition-estimation brief with a strict JSON contract. */
export function mealEstimatePrompt(input: string): string {
  return `You are a sports nutritionist estimating the nutrition facts of one meal.

${input}

Estimate realistic values for a single serving. Use standard food composition data
(USDA-like) and sensible portion sizes when the user is vague. Keep macros
consistent with kcal (protein 4 kcal/g, carbs 4 kcal/g, fat 9 kcal/g, tolerance
about 10%). Name the meal in the same language the user used, short and specific.
Pick the meal slots it realistically fits. Use "order-out" in tags only when it is
clearly restaurant/delivery food, and then still list the main components as
ingredients. Ingredient quantities are per serving, in g / ml / unit. Set
confidence to "low" when the input is vague or the photo is unclear.
Add a short note (max 160 chars) explaining the main assumption you made.

Return ONLY minified JSON, no prose, no code fence, with exactly this shape:
{"name":string,"slots":["breakfast"|"lunch"|"snack"|"dinner"],"kcal":number,"proteinG":number,"carbsG":number,"fatG":number,"prepMin":number,"tags":["high-protein"|"high-carb"|"light"|"order-out"|"quick"],"ingredients":[{"name":string,"qty":number,"unit":string,"aisle":"Produce"|"Protein"|"Pantry"|"Dairy"|"Frozen"|"Bakery"}],"confidence":"low"|"medium"|"high","note":string}`;
}
