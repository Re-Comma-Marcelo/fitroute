import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { meals } from "@/lib/data/meals.mock";
import { encodeBridgeCode, type DietPayload } from "@/lib/claude-bridge";
import { dbModule, requireMcpUser } from "../db";

const SLOTS = ["breakfast", "lunch", "snack", "dinner"] as const;

export default defineTool({
  name: "create_week_diet",
  title: "Plan a week of meals",
  description:
    "Writes meal slots for one or more days directly into the connected user's app, and also returns an import code as a fallback. Call get_training_context first for valid mealId values.",
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
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const userId = await requireMcpUser(ctx);

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
            text: `Fix these before saving:\n${problems.join("\n")}\nCall get_training_context for the meal library.`,
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

    const { db, unwrap } = await dbModule();
    const client = db();
    // Writes into the meal diary (meal_entries), the one model the app reads.
    // The id is derived from date + slot + meal so re-running the same plan
    // updates those rows instead of planning every meal twice.
    const rows = Object.entries(days).flatMap(([date, slots]) =>
      SLOTS.filter((s) => slots[s]).map((s) => ({
        id: `de_mcp_${date}_${s}_${slots[s] as string}`,
        user_id: userId,
        entry_date: date,
        slot: s,
        meal_id: slots[s] as string,
        planned: true,
        eaten: false,
      })),
    );
    unwrap(await client.from("meal_entries").upsert(rows, { onConflict: "id" }).select("meal_id"));

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
      `Meal plan saved in your app: ${Object.keys(days).length} day(s), ${rows.length} slot(s) filled.`,
      ...lines,
      "",
      "If you prefer to review it first, this import code also works in Profile → Claude → Import:",
      code,
    ].join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { saved: true, slots: rows.length, code, days },
    };
  },
});
