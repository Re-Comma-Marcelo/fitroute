import { getWorkouts } from "@/lib/data/workouts";
import { getTargets, isoDate, addDays, getMeal } from "@/lib/data/nutrition";
import { getDayNutrition, getEntriesForDates, totalsForEntries } from "@/lib/data/diet-entries";
import { tx } from "@/lib/format";
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
  const today = isoDate(new Date());
  const previousDays = [1, 2, 3].map((back) => isoDate(addDays(new Date(), -back)));

  const [targets, workouts, todayFood, recentEntries] = await Promise.all([
    getTargets(),
    getWorkouts(),
    getDayNutrition(today),
    getEntriesForDates(previousDays),
  ]);

  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;

  // Eaten totals for today once anything is logged; planned totals before that.
  const useEaten = todayFood.entries.some((e) => e.eaten);
  const totals = useEaten ? todayFood.eaten : todayFood.planned;
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
          title: tx("Post-workout window"),
          body: tx(
            "You trained {since} min ago. A high-protein meal now tops up recovery — you have {open}g of protein still open today.",
            { since, open: Math.max(0, targets.proteinG - proteinG) },
          ),
        };
      }
    } else if (startH > nowH && startH - nowH < 1.5) {
      // Upcoming session within 90 min.
      const until = Math.round((startH - nowH) * 60);
      return {
        id: "nutrition-pre-workout",
        scope: "nutrition",
        severity: "info",
        title: tx("Fuel up before training"),
        body: tx(
          "You train in about {until} min. A carb-focused snack now gives you glycogen for the session — keep fat and fibre low so it digests in time.",
          { until },
        ),
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
      title: tx("Protein still open"),
      body: tx(
        "You have {protein}g of protein and {kcal} kcal left today. One high-protein meal covers the gap.",
        { protein: Math.round(remProtein), kcal: Math.round(remKcal) },
      ),
    };
  }

  // 3) Protein deficit streak across the last three logged days.
  let lowDays = 0;
  for (const date of previousDays) {
    const t = totalsForEntries(recentEntries.filter((e) => e.date === date && e.eaten));
    if (t.proteinG > 0 && t.proteinG < targets.proteinG * 0.8) lowDays++;
  }
  if (lowDays >= 3) {
    return {
      id: "nutrition-protein-streak",
      scope: "nutrition",
      severity: "warning",
      title: tx("Protein has been low"),
      body: tx(
        "Protein landed under 80% of your target for the last 3 days. Add a high-protein meal or snack today to stay ahead of recovery.",
      ),
    };
  }

  // 4) Nothing planned today and no workout — keep it simple.
  if (!todayFood.entries.length && !todaysWorkout) {
    return {
      id: "nutrition-plan-today",
      scope: "nutrition",
      severity: "info",
      title: tx("Plan your meals"),
      body: tx(
        "No meals planned today. Pick a meal for each slot and the rings show how it lines up with your targets.",
      ),
    };
  }

  // 5) Default: report where the day stands.
  const pct = Math.round((kcal / Math.max(1, targets.kcal)) * 100);
  return {
    id: "nutrition-day-status",
    scope: "nutrition",
    severity: "info",
    title: tx("Today's nutrition"),
    body: `${tx("{kcal} of {target} kcal planned ({pct}%) · {protein}/{proteinTarget}g protein · {carbs}g carbs.", { kcal, target: targets.kcal, pct, protein: proteinG, proteinTarget: targets.proteinG, carbs: carbsG })} ${
      remProtein > 20
        ? tx("{protein}g protein still open.", { protein: Math.round(remProtein) })
        : tx("Protein target is within reach.")
    }`,
  };
}
