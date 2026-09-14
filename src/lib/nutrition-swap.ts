import type {
  DayTotals,
  Meal,
  MealSlot,
  MealTag,
  NutritionTargets,
  TrainingTag,
} from "./nutrition-types";

/** Macro emphasis each training tag calls for. */
const TAG_PRIORITY: Record<TrainingTag, { tag: MealTag; label: string }> = {
  Strength: { tag: "high-protein", label: "protein" },
  Cardio: { tag: "high-carb", label: "carbs" },
  Rest: { tag: "light", label: "lighter food" },
};

/** Share of the daily budget a slot is expected to cover. */
const SLOT_SHARE: Record<MealSlot, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  snack: 0.12,
  dinner: 0.28,
};

export interface SwapContext {
  slot: MealSlot;
  targets: NutritionTargets;
  /** Totals already planned for the day, including the current meal. */
  dayTotals: DayTotals;
  currentMeal?: Meal | null | undefined;
  /** Today's training tag. */
  tag?: TrainingTag | undefined;
  /** Tags of the last few sessions, most recent first. */
  recentTags?: TrainingTag[] | undefined;
}

export interface RankedMeal {
  meal: Meal;
  score: number;
  reason: string;
}

function remaining(ctx: SwapContext): NutritionTargets {
  const cur = ctx.currentMeal;
  return {
    kcal: ctx.targets.kcal - (ctx.dayTotals.kcal - (cur?.kcal ?? 0)),
    proteinG: ctx.targets.proteinG - (ctx.dayTotals.proteinG - (cur?.proteinG ?? 0)),
    carbsG: ctx.targets.carbsG - (ctx.dayTotals.carbsG - (cur?.carbsG ?? 0)),
    fatG: ctx.targets.fatG - (ctx.dayTotals.fatG - (cur?.fatG ?? 0)),
  };
}

/** Lower is better: distance from the slot's ideal macro window, minus training-fit bonus. */
function scoreMeal(meal: Meal, ctx: SwapContext, rem: NutritionTargets): number {
  const share = SLOT_SHARE[ctx.slot];
  const ideal = {
    kcal: Math.max(150, rem.kcal * share),
    proteinG: Math.max(10, rem.proteinG * share),
    carbsG: Math.max(10, rem.carbsG * share),
    fatG: Math.max(4, rem.fatG * share),
  };

  const dev =
    (2.2 * Math.abs(meal.proteinG - ideal.proteinG)) / Math.max(1, ideal.proteinG) +
    (1.4 * Math.abs(meal.carbsG - ideal.carbsG)) / Math.max(1, ideal.carbsG) +
    (0.8 * Math.abs(meal.fatG - ideal.fatG)) / Math.max(1, ideal.fatG) +
    (1.6 * Math.abs(meal.kcal - ideal.kcal)) / Math.max(1, ideal.kcal);

  let bonus = 0;
  const priority = ctx.tag ? TAG_PRIORITY[ctx.tag] : null;
  if (priority && meal.tags.includes(priority.tag)) bonus += 0.9;

  // Repeated strength work in recent sessions raises the protein weighting.
  const strengthCount = (ctx.recentTags ?? []).filter((t) => t === "Strength").length;
  if (strengthCount >= 2 && meal.tags.includes("high-protein")) bonus += 0.4;
  const cardioCount = (ctx.recentTags ?? []).filter((t) => t === "Cardio").length;
  if (cardioCount >= 2 && meal.tags.includes("high-carb")) bonus += 0.3;

  return dev - bonus;
}

function reasonFor(
  meal: Meal,
  ctx: SwapContext,
  rem: NutritionTargets,
  current?: Meal | null,
): string {
  const parts: string[] = [];
  if (current) {
    const dp = Math.round(meal.proteinG - current.proteinG);
    const dc = Math.round(meal.carbsG - current.carbsG);
    if (ctx.tag === "Strength" && dp > 4) parts.push(`+${dp}g protein for today's strength work`);
    else if (ctx.tag === "Cardio" && dc > 8) parts.push(`+${dc}g carbs to fuel cardio`);
    else if (ctx.tag === "Rest" && meal.kcal < current.kcal)
      parts.push(`${Math.round(current.kcal - meal.kcal)} kcal lighter for a rest day`);
    else if (dp > 4) parts.push(`+${dp}g protein`);
  }
  if (rem.proteinG > 40 && meal.tags.includes("high-protein"))
    parts.push(`${Math.round(rem.proteinG)}g protein still open today`);
  if (rem.carbsG > 80 && meal.tags.includes("high-carb"))
    parts.push(`${Math.round(rem.carbsG)}g carbs still open today`);
  const strengthCount = (ctx.recentTags ?? []).filter((t) => t === "Strength").length;
  if (!parts.length && strengthCount >= 2)
    parts.push(`${strengthCount} strength sessions recently — keeps protein high`);
  if (!parts.length) parts.push("Closest fit to what's left of your macro targets");
  return parts.slice(0, 2).join(" · ");
}

/** Meals for the slot ordered by training + macro fit. */
export function rankMeals(meals: Meal[], ctx: SwapContext): RankedMeal[] {
  const rem = remaining(ctx);
  return meals
    .map((meal) => ({
      meal,
      score: scoreMeal(meal, ctx, rem),
      reason: reasonFor(meal, ctx, rem, ctx.currentMeal),
    }))
    .sort((a, b) => a.score - b.score);
}
