import type { Meal } from "../nutrition-types";
import type { Experience, PlanIntake, TimeBudget } from "./types";

/**
 * Evidence-based weekly bodyweight-change pace — gaining and losing are NOT
 * the same rate, so this used to be one flat number for both, which meant a
 * bulk running 2-13x faster than research supports could pass the check.
 *
 * - Fat loss: Garthe et al. 2011 (Int J Sport Nutr Exerc Metab 21(2):97-104)
 *   put elite athletes on a ~0.7%-bodyweight/week deficit vs a ~1.4%/week
 *   one; the slower group kept significantly more lean mass and
 *   performance. 0.7% sits inside the commonly cited 0.5-1%/week range, so
 *   it's used here as the single figure — unlike gaining, cutting faster
 *   mostly costs lean mass at any training age, not "wasted potential", so
 *   this one isn't tiered by experience.
 * - Muscle gain: the Aragon/Helms rate-of-gain model (the standard cited
 *   benchmark for natural lifters) — 1-1.5% bodyweight/month for a
 *   beginner, 0.5-1%/month intermediate, 0.25-0.5%/month advanced. Applying
 *   the fat-loss figure to a bulk (the old behaviour) would ask for
 *   3-8x that rate; weight gained that fast is mostly fat, not muscle.
 *   Converted to weekly (÷ 4.345) and using each range's midpoint below.
 */
export const FAT_LOSS_WEEKLY_PACE_PCT = 0.007;
export const MUSCLE_GAIN_WEEKLY_PACE_PCT: Record<Experience, number> = {
  beginner: 0.0029, // ~1.25%/month midpoint
  intermediate: 0.0017, // ~0.75%/month midpoint
  advanced: 0.0009, // ~0.375%/month midpoint
};

export interface PaceCheck {
  /** Absolute weekly change implied by the request, in kg. */
  weeklyKg: number;
  /** Safe weekly change for this bodyweight and direction. */
  safeWeeklyKg: number;
  ok: boolean;
  suggestedWeeks: number;
}

/** `experience` only matters when gaining — losing uses one figure for everyone. */
export function checkPace(
  currentKg: number,
  targetKg: number | null,
  weeks: number | null,
  experience: Experience = "intermediate",
): PaceCheck | null {
  if (!targetKg || !weeks || weeks <= 0) return null;
  const delta = Math.abs(currentKg - targetKg);
  if (delta <= 0) return null;
  const gaining = targetKg > currentKg;
  const pacePct = gaining ? MUSCLE_GAIN_WEEKLY_PACE_PCT[experience] : FAT_LOSS_WEEKLY_PACE_PCT;
  const weeklyKg = delta / weeks;
  const safeWeeklyKg = Math.max(gaining ? 0.05 : 0.15, currentKg * pacePct);
  const ok = weeklyKg <= safeWeeklyKg * 1.05;
  return {
    weeklyKg: Math.round(weeklyKg * 100) / 100,
    safeWeeklyKg: Math.round(safeWeeklyKg * 100) / 100,
    ok,
    suggestedWeeks: Math.max(weeks, Math.ceil(delta / safeWeeklyKg)),
  };
}

/** Does the week the user described leave room for the goal they asked for? */
export function checkTimeFit(intake: PlanIntake, budget: TimeBudget): string | null {
  if (budget.gymSlots.length === 0) {
    return "Your week has no usable slot yet — mark at least one part of a day as free or tight.";
  }
  if (budget.tight && intake.gymDaysPerWeek >= 4) {
    return "Your week realistically holds fewer gym days than you asked for, so the plan uses shorter, higher-value sessions instead.";
  }
  if (budget.recoveryFactor <= 0.8) {
    return "Sleep, stress and your sport load are high right now, so the plan keeps weekly volume lower on purpose.";
  }
  return null;
}

function terms(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

/** Hard filter in code — allergies and dislikes are never left to the prompt alone. */
export function filterMeals(meals: Meal[], intake: PlanIntake, maxPrepMin: number): Meal[] {
  const banned = [...terms(intake.allergies), ...terms(intake.dislikes)];
  const allowed = meals.filter((meal) => {
    const haystack = [meal.name, ...meal.ingredients.map((i) => i.name)].join(" ").toLowerCase();
    return !banned.some((term) => haystack.includes(term));
  });
  const quick = allowed.filter((m) => m.prepMin <= maxPrepMin || m.orderOut);
  return quick.length >= 8 ? quick : allowed;
}

export function isMealAllowed(meal: Meal, intake: PlanIntake): boolean {
  const banned = [...terms(intake.allergies), ...terms(intake.dislikes)];
  const haystack = [meal.name, ...meal.ingredients.map((i) => i.name)].join(" ").toLowerCase();
  return !banned.some((term) => haystack.includes(term));
}

export const CONSULT_NOTE =
  "General guidance only — check with a doctor or dietitian before big changes, especially with a medical condition.";
