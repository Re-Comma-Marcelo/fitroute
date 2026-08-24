import { defineTool } from "@lovable.dev/mcp-js";
import { exercises } from "@/lib/data/mocks";
import { meals } from "@/lib/data/meals.mock";

export default defineTool({
  name: "get_training_context",
  title: "Get Forja libraries",
  description:
    "Returns Forja's exercise library and meal library, plus how to build plans for this app. Call this first — routines and diets may only use these ids.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const payload = {
      howToUse: [
        "Forja is a strength-training + nutrition app. The user pastes their own training context (equipment, exercises to avoid, session length, preferred time, weekly target, goal, recent sessions, logged soreness/injuries) into the chat — read it if present.",
        "Use create_routine to build a workout routine and create_week_diet to plan meals. Both return a Forja code the user pastes into Profile → Claude → Import.",
        "Only use exerciseId / mealId values from the libraries below. Respect any exercises the user said to avoid, and only pick meals whose slots include the slot you are filling.",
      ],
      exercises: exercises.map((e) => ({
        id: e.id,
        name: e.nome,
        muscleGroup: e.grupoPrimario,
        secondary: e.gruposSecundarios,
        equipment: e.equipamento,
      })),
      meals: meals.map((m) => ({
        id: m.id,
        name: m.name,
        slots: m.slots,
        kcal: m.kcal,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
        prepMin: m.prepMin,
        tags: m.tags,
      })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
