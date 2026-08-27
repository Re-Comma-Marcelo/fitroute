import type { Meal } from "../nutrition-types";
import type { PlanIntake, TimeBudget } from "./types";

export interface PaceCheck {
  /** Absolute weekly change implied by the request, in kg. */
  weeklyKg: number;
  /** Safe weekly change for this bodyweight (0.5–1% of bodyweight). */
  safeWeeklyKg: number;
  ok: boolean;
  suggestedWeeks: number;
}

/** Mainstream guidance: 0.5–1% of bodyweight per week is a sustainable pace. */
export function checkPace(
  currentKg: number,
  targetKg: number | null,
  weeks: number | null,
): PaceCheck | null {
  if (!targetKg || !weeks || weeks <= 0) return null;
  const delta = Math.abs(currentKg - targetKg);
  const weeklyKg = delta / weeks;
  const safeWeeklyKg = Math.max(0.25, currentKg * 0.0075);
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
