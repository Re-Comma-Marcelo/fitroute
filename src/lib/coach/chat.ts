import { getRoutines } from "@/lib/data/routines";
import { tx } from "@/lib/format";
import { getNutritionInsight } from "./nutrition";
import { getTodayPlan } from "./recommendations";
import { getRoutineInsights } from "./exercise-insights";
import type { CoachInsight } from "./types";

export interface CoachChatMessage {
  role: "user" | "coach";
  text: string;
}

export async function askCoach(question: string): Promise<{
  answer: string;
  insights: CoachInsight[];
}> {
  const q = question.toLowerCase();
  const asks = (...terms: string[]) => terms.some((term) => q.includes(term));

  // Keyword matching across the three supported languages (en / pt / nl).
  if (
    asks(
      "today",
      "train",
      "what to",
      "workout",
      "hoje",
      "treinar",
      "treino",
      "vandaag",
      "trainen",
      "training",
    )
  ) {
    const plan = await getTodayPlan();
    return {
      answer: tx("{title}. {reason}", {
        title: plan.recommendation.title,
        reason: plan.recommendation.reason,
      }),
      insights: plan.insights,
    };
  }

  if (
    asks(
      "stuck",
      "stalled",
      "plateau",
      "stall",
      "estagnado",
      "travado",
      "platô",
      "plato",
      "vast",
      "stagn",
    )
  ) {
    const routines = await getRoutines();
    const insights: CoachInsight[] = [];
    for (const r of routines) {
      const map = await getRoutineInsights(r);
      insights.push(
        ...Object.values(map).filter(
          (i) => i.plateauType === "single-exercise" || i.plateauType === "strength",
        ),
      );
    }
    if (insights.length) {
      return {
        answer: tx(
          "Stalled lifts: {lifts}. Push for reps or consider a small load jump if form is clean.",
          { lifts: insights.map((i) => i.title).join(", ") },
        ),
        insights,
      };
    }
    return {
      answer: tx(
        "No stalled lifts detected right now. Keep hitting your rep ranges before adding load.",
      ),
      insights: [],
    };
  }

  if (
    asks("rest", "recovery", "sleep", "descanso", "recupera", "sono", "rust", "herstel", "slaap")
  ) {
    return {
      answer: tx(
        "Rest long enough to hit the next set with quality. Compound lifts usually need 90–180s; isolation moves 60–90s. If your RPE is climbing, add 15–30s.",
      ),
      insights: [],
    };
  }

  if (
    asks(
      "protein",
      "nutrition",
      "eat",
      "meal",
      "diet",
      "proteína",
      "proteina",
      "dieta",
      "comer",
      "refei",
      "eiwit",
      "voeding",
      "eten",
      "maaltijd",
    )
  ) {
    const n = await getNutritionInsight();
    return {
      answer: n?.body ?? tx("Nutrition notes will get sharper once meal logging ships."),
      insights: n ? [n] : [],
    };
  }

  // Open-ended reasoning happens in Claude over the MCP connector, which can
  // read and write the same data. In-app answers stay grounded and heuristic.
  return {
    answer: tx(
      "I can answer what to train today, what’s stalled, and recovery or nutrition questions. For open-ended coaching, connect Claude to this app in Profile → AI assistant — it reads your real training data over MCP.",
    ),
    insights: [],
  };
}
