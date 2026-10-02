import type { Meal } from "../nutrition-types";
import type { Experience, PlanIntake, TimeBudget } from "./types";

/**
 * Evidence-based weekly bodyweight-change pace. Gaining and losing are NOT
 * the same rate, and for gaining the scale and the muscle are two different
 * numbers. Sources: src/lib/science/sources.ts.
 *
 * - Fat loss: Garthe et al. 2011 put elite athletes on a ~0.7%/week deficit
 *   vs ~1.4%/week; the slower group kept (even gained) lean mass and
 *   strength. Not tiered by experience — cutting faster costs lean mass at
 *   any training age.
 * - Scale weight while building muscle ("lean bulk"): Iraki et al. 2019
 *   recommend ~0.25-0.5% bodyweight/week for novice/intermediate lifters on
 *   a ~10-20% surplus, more conservative for advanced. A scale gain is never
 *   only muscle (some fat, water, glycogen), so it runs ahead of the muscle
 *   rate below. Beginners sit at the top of the range, advanced below it.
 * - "Just gain weight, fat is fine": the top of Iraki's range, 0.5%/week —
 *   also about the ~0.45 kg/week sports-nutrition guidelines aim for
 *   (Larson-Meyer et al. 2022). Muscle doesn't grow faster on a bigger
 *   surplus: the extra is mostly fat (Garthe et al. 2013; Helms et al. 2023).
 * - Above ~0.75%/week the app warns: that is overfeeding territory (Bray et
 *   al. 2012, +40% energy for 8 weeks) where roughly half the gain is fat.
 * - Muscle itself: Aragon's model — 1-1.5% bodyweight/month beginner,
 *   0.5-1% intermediate, 0.25-0.5% advanced — only used to say how much of a
 *   gain is likely muscle, never as the scale target (that was a bug).
 */
export const FAT_LOSS_WEEKLY_PACE_PCT = 0.007;
export const LEAN_GAIN_WEEKLY_PCT: Record<Experience, number> = {
  beginner: 0.004,
  intermediate: 0.003,
  advanced: 0.002,
};
export const GENERAL_GAIN_WEEKLY_PCT = 0.005;
export const GAIN_WARN_WEEKLY_PCT = 0.0075;
/** Aragon's monthly muscle-gain range, as a share of bodyweight. */
export const MUSCLE_GAIN_MONTHLY_PCT: Record<Experience, [number, number]> = {
  beginner: [0.01, 0.015],
  intermediate: [0.005, 0.01],
  advanced: [0.0025, 0.005],
};

export interface PaceCheck {
  /** Absolute weekly change implied by the request, in kg. */
  weeklyKg: number;
  /** Steady weekly change for this bodyweight and direction. */
  safeWeeklyKg: number;
  ok: boolean;
  suggestedWeeks: number;
}

/**
 * Experience shapes the suggested lean pace (goal-path.ts), not the check. Gaining is only flagged past GAIN_WARN_WEEKLY_PCT, so both a
 * lean bulk and a deliberate "just gain" goal pass.
 */
export function checkPace(
  currentKg: number,
  targetKg: number | null,
  weeks: number | null,
  _experience: Experience = "intermediate",
): PaceCheck | null {
  if (!targetKg || !weeks || weeks <= 0) return null;
  const delta = Math.abs(currentKg - targetKg);
  if (delta <= 0) return null;
  const gaining = targetKg > currentKg;
  const weeklyKg = delta / weeks;
  const safeWeeklyKg = Math.max(
    gaining ? 0.05 : 0.15,
    currentKg * (gaining ? GENERAL_GAIN_WEEKLY_PCT : FAT_LOSS_WEEKLY_PACE_PCT),
  );
  const limit = gaining ? currentKg * GAIN_WARN_WEEKLY_PCT : safeWeeklyKg * 1.05;
  return {
    weeklyKg: Math.round(weeklyKg * 100) / 100,
    safeWeeklyKg: Math.round(safeWeeklyKg * 100) / 100,
    ok: weeklyKg <= limit,
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
