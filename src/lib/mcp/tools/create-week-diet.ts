import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { meals } from "@/lib/data/meals.mock";
import { encodeBridgeCode, type DietPayload } from "@/lib/claude-bridge";

const SLOTS = ["breakfast", "lunch", "snack", "dinner"] as const;

export default defineTool({
  name: "create_week_diet",
  title: "Plan a week of meals",
  description:
    "Fills Forja meal slots for one or more days from the meal library and returns an import code plus a readable summary. Call get_training_context first for valid mealId values.",
  inputSchema: {
    days: z
      .array(
        z.object({
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe("ISO date, yyyy-mm-dd."),
          breakfast: z.string().optional().describe("mealId"),
          lunch: z.string().optional().describe("mealId"),
          snack: z.string().optional().describe("mealId"),
          dinner: z.string().optional().describe("mealId"),
        }),
      )
      .min(1)
      .max(14)
      .describe("One entry per day. Leave a slot out if the user does not eat it."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: (input) => {
    const problems: string[] = [];
    const days: DietPayload["days"] = {};

    for (const day of input.days) {
      const entry: Partial<Record<(typeof SLOTS)[number], string>> = {};
      for (const slot of SLOTS) {
        const mealId = day[slot];
        if (!mealId) continue;
        const meal = meals.find((m) => m.id === mealId);
        if (!meal) {
          problems.push(`${day.date} ${slot}: unknown mealId "${mealId}"`);
          continue;
        }
        if (!meal.slots.includes(slot)) {
          problems.push(
            `${day.date} ${slot}: "${meal.name}" is not a ${slot} meal (valid: ${meal.slots.join(", ")})`,
          );
          continue;
        }
        entry[slot] = mealId;
      }
      if (Object.keys(entry).length) days[day.date] = entry;
    }

    if (problems.length) {
      return {
        content: [
          {
            type: "text",
            text: `Fix these before importing:\n${problems.join("\n")}\nCall get_training_context for the meal library.`,
          },
        ],
        isError: true,
      };
    }
    if (!Object.keys(days).length) {
      return { content: [{ type: "text", text: "No meals were provided." }], isError: true };
    }

    const payload: DietPayload = { kind: "diet", days };
    const code = encodeBridgeCode(payload);

    const lines = Object.entries(days).map(([date, slots]) => {
      const parts = SLOTS.filter((s) => slots[s]).map((s) => {
        const meal = meals.find((m) => m.id === slots[s])!;
        return `${s}: ${meal.name} (${meal.kcal} kcal, ${meal.proteinG}g P)`;
      });
      const kcal = SLOTS.reduce(
        (sum, s) => sum + (meals.find((m) => m.id === slots[s])?.kcal ?? 0),
        0,
      );
      return `${date} — ${kcal} kcal\n  ${parts.join("\n  ")}`;
    });

    const summary = [
      ...lines,
      "",
      "Paste this code into Forja → Profile → Claude → Import:",
      code,
    ].join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { code, days },
    };
  },
});
