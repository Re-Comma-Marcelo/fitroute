import { getWorkouts } from "@/lib/data/workouts";
import { getTargets, getWeekPlan, isoDate, totalsFor, getMeal } from "@/lib/data/nutrition";
import { getEaten } from "@/lib/nutrition-local";
import type { CoachInsight } from "./types";

function hourMin(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

/**
 * Grounded nutrition insight — replaces the old hardcoded "meal logging coming
 * soon" message. Uses real planned/eaten macros, recent training and the meal
 * schedule to say something useful about the day.
 */
export async function getNutritionInsight(): Promise<CoachInsight | null> {
  const [targets, plan, workouts, eaten] = await Promise.all([
    getTargets(),
    getWeekPlan(),
    getWorkouts(),
    getEaten(),
  ]);

  const today = isoDate(new Date());
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;

  // Eaten totals for today (meals actually consumed), planned totals otherwise.
  const eatenDay = eaten[today] ?? {};
  const plannedDay = plan[today] ?? {};
  const useEaten = Object.keys(eatenDay).length > 0;
  const day = useEaten ? { ...plannedDay, ...eatenDay } : plannedDay;
  const totals = totalsFor(day);
  const kcal = totals.kcal;
  const proteinG = totals.proteinG;
  const carbsG = totals.carbsG;

  // 1) Pre/post-workout timing — strongest, most actionable.
  const todaysWorkout = workouts.find((w) => isoDate(new Date(w.iniciadoEm)) === today);
  if (todaysWorkout) {
    const startH = hourMin(todaysWorkout.iniciadoEm);
    const endH = todaysWorkout.finalizadoEm
      ? hourMin(todaysWorkout.finalizadoEm)
      : startH + todaysWorkout.duracaoSeg / 3600;

    // Already finished? Push a post-workout protein note.
    if (endH < nowH && nowH - endH < 3) {
      const since = Math.round((nowH - endH) * 60);
      if (proteinG < targets.proteinG * 0.4) {
        return {
          id: "nutrition-post-workout",
          scope: "nutrition",
          severity: "nudge",
          title: "Post-workout window",
          body: `You trained ${since} min ago. A high-protein meal now tops up recovery — you have ${Math.max(0, targets.proteinG - proteinG)}g of protein still open today.`,
        };
      }
    } else if (startH > nowH && startH - nowH < 1.5) {
      // Upcoming session within 90 min.
      const until = Math.round((startH - nowH) * 60);
      return {
        id: "nutrition-pre-workout",
        scope: "nutrition",
        severity: "info",
        title: "Fuel up before training",
        body: `You train in about ${until} min. A carb-focused snack now gives you glycogen for the session — keep fat and fibre low so it digests in time.`,
      };
    }
  }

  // 2) Remaining macros for the day.
  const remProtein = Math.max(0, targets.proteinG - proteinG);
  const remKcal = Math.max(0, targets.kcal - kcal);
  if (useEaten && remProtein > 30 && nowH < 21) {
    return {
      id: "nutrition-protein-remaining",
      scope: "nutrition",
      severity: "nudge",
      title: "Protein still open",
      body: `You have ${Math.round(remProtein)}g of protein and ${Math.round(remKcal)} kcal left today. One high-protein meal covers the gap.`,
    };
  }

  // 3) Protein deficit streak across recent planned days.
  let lowDays = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayPlan = plan[isoDate(d)] ?? {};
    const t = totalsFor(dayPlan);
    if (t.proteinG > 0 && t.proteinG < targets.proteinG * 0.8) lowDays++;
  }
  if (lowDays >= 3) {
    return {
      id: "nutrition-protein-streak",
      scope: "nutrition",
      severity: "warning",
      title: "Protein has been low",
      body: `Protein landed under 80% of your target for the last 3 days. Add a high-protein meal or snack today to stay ahead of recovery.`,
    };
  }

  // 4) Nothing planned today and no workout — keep it simple.
  if (!Object.keys(plannedDay).length && !todaysWorkout) {
    return {
      id: "nutrition-plan-today",
      scope: "nutrition",
      severity: "info",
      title: "Plan your meals",
      body: "No meals planned today. Pick a meal for each slot and the rings show how it lines up with your targets.",
    };
  }

  // 5) Default: report where the day stands.
  const pct = Math.round((kcal / Math.max(1, targets.kcal)) * 100);
  return {
    id: "nutrition-day-status",
    scope: "nutrition",
    severity: "info",
    title: "Today's nutrition",
    body: `${kcal} of ${targets.kcal} kcal planned (${pct}%) · ${proteinG}/${targets.proteinG}g protein · ${carbsG}g carbs. ${remProtein > 20 ? `${Math.round(remProtein)}g protein still open.` : "Protein target is within reach."}`,
  };
}
