import { getRoutines } from "@/lib/data/routines";
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

  if (q.includes("today") || q.includes("train") || q.includes("what to") || q.includes("treinar")) {
    const plan = await getTodayPlan();
    return {
      answer: `${plan.recommendation.title}. ${plan.recommendation.reason}`,
      insights: plan.insights,
    };
  }

  if (q.includes("stuck") || q.includes("stalled") || q.includes("plateau") || q.includes("estagnado")) {
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
        answer: `Stalled lifts: ${insights.map((i) => i.title).join(", ")}. Push for reps or consider a small load jump if form is clean.`,
        insights,
      };
    }
    return {
      answer: "No stalled lifts detected right now. Keep hitting your rep ranges before adding load.",
      insights: [],
    };
  }

  if (q.includes("rest") || q.includes("descanso") || q.includes("recovery")) {
    return {
      answer:
        "Rest long enough to hit the next set with quality. Compound lifts usually need 90–180s; isolation moves 60–90s. If your RPE is climbing, add 15–30s.",
      insights: [],
    };
  }

  if (q.includes("protein") || q.includes("nutrition") || q.includes("dieta") || q.includes("eat")) {
    const n = await getNutritionInsight();
    return {
      answer: n?.body ?? "Nutrition notes will get sharper once meal logging ships.",
      insights: n ? [n] : [],
    };
  }

  return {
    answer:
      "I can’t reason about that yet. Ask me what to train today, what’s stalled, or about recovery and nutrition.",
    insights: [],
  };
}
