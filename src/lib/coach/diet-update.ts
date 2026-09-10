import { tx } from "@/lib/format";
import { localEntries } from "@/lib/diet-day";
import { addDays, isoDate } from "@/lib/data/nutrition";
import type { DietEntry } from "@/lib/data/diet-entries";
import type { DayTotals, Meal, NutritionTargets } from "@/lib/nutrition-types";
import type { CoachInsight } from "./types";

export interface DietUpdateInput {
  date: string;
  targets: NutritionTargets;
  /** What the user actually ate so far. */
  eaten: DayTotals;
  /** Planned but not yet eaten, on top of `eaten`. */
  plannedRemaining: DayTotals;
  entries: DietEntry[];
  /** Best coach suggestion for what is still open today, when there is one. */
  suggestion?: Meal | null | undefined;
  /** Hour of day, 0-24. Injected for testability. */
  hour: number;
}

/** Consecutive days before `date` where the user logged at least one meal. */
function loggingStreak(date: string): number {
  let streak = 0;
  for (let back = 1; back <= 14; back++) {
    const d = isoDate(addDays(new Date(date), -back));
    if (localEntries(d).some((e) => e.eaten)) streak++;
    else break;
  }
  return streak;
}

/**
 * The coach's read on today's food, built from the day's real numbers.
 * Same voice and card treatment as the other coach moments: direct, concrete,
 * never cheerleading, never guilt-tripping.
 */
export function getDietCoachUpdate(input: DietUpdateInput): CoachInsight {
  const { targets, eaten, hour, suggestion } = input;
  const openKcal = Math.round(targets.kcal - eaten.kcal);
  const openProtein = Math.round(targets.proteinG - eaten.proteinG);
  const eatenCount = input.entries.filter((e) => e.eaten).length;
  const base = { id: "diet-coach-update", scope: "nutrition" as const };

  // 1) Late in the day with a real protein gap — point at a concrete fix.
  if (openProtein > 30 && hour >= 16) {
    return {
      ...base,
      severity: "nudge",
      title: tx("Protein still open"),
      body: suggestion
        ? tx("{protein}g protein left and it's getting late. {meal} covers most of it.", {
            protein: openProtein,
            meal: suggestion.name,
          })
        : tx("{protein}g protein left and it's getting late. Plan one high-protein meal.", {
            protein: openProtein,
          }),
    };
  }

  // 2) Budget nearly spent — concrete, no panic.
  if (openKcal <= 250 && openKcal > 0) {
    return {
      ...base,
      severity: "nudge",
      title: tx("Almost at your budget"),
      body: tx("Only {kcal} kcal left today — keep the evening light.", { kcal: openKcal }),
    };
  }
  if (openKcal <= 0) {
    return {
      ...base,
      severity: "warning",
      title: tx("Over your budget"),
      body: tx(
        "You're {kcal} kcal over today. One day doesn't undo a week — keep tomorrow normal.",
        {
          kcal: Math.abs(openKcal),
        },
      ),
    };
  }

  // 3) Consistency worth naming, briefly.
  const streak = loggingStreak(input.date);
  if (streak >= 3 && eatenCount > 0) {
    return {
      ...base,
      severity: "info",
      title: tx("{days} days logged in a row", { days: streak }),
      body: tx(
        "You've logged your food {days} days straight. That's what makes the numbers usable.",
        {
          days: streak,
        },
      ),
    };
  }

  // 4) Nothing eaten yet.
  if (!eatenCount) {
    return {
      ...base,
      severity: "info",
      title: tx("Nothing logged yet today"),
      body: suggestion
        ? tx("Your budget is {kcal} kcal and {protein}g protein. {meal} is a solid start.", {
            kcal: Math.round(targets.kcal),
            protein: Math.round(targets.proteinG),
            meal: suggestion.name,
          })
        : tx("Your budget is {kcal} kcal and {protein}g protein. Plan a meal to fill the day.", {
            kcal: Math.round(targets.kcal),
            protein: Math.round(targets.proteinG),
          }),
    };
  }

  // 5) Neutral, functional observation.
  return {
    ...base,
    severity: "info",
    title: tx("Where today stands"),
    body: tx(
      "{kcal} kcal and {protein}g protein still open, spread over {meals} planned meal(s).",
      {
        kcal: openKcal,
        protein: Math.max(0, openProtein),
        meals: input.entries.filter((e) => !e.eaten).length,
      },
    ),
  };
}
