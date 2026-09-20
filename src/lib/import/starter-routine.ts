/**
 * Builds the starter routines from the onboarding answers. Pure functions:
 * the caller saves what comes back. One routine per training day, from the
 * same templates the "Start from a template" sheet uses, so a new account
 * gets a whole week instead of a single day.
 */
import {
  ROUTINE_TEMPLATES,
  buildTemplateRoutines,
  type RoutineTemplate,
} from "../routine-templates";
import type { Exercise, Objetivo, Routine } from "../types";

export type StarterGoal = "muscle" | "strength" | "fat-loss" | "comeback";
export type StarterExperience = "beginner" | "intermediate" | "advanced";

export interface StarterAnswers {
  goal: StarterGoal;
  /** Weekdays picked for training, 0 = Sunday … 6 = Saturday. */
  days: number[];
  experience: StarterExperience;
}

/** Used for whatever the person skipped. */
export const DEFAULT_ANSWERS: StarterAnswers = {
  goal: "muscle",
  days: [1, 3, 5],
  experience: "intermediate",
};

/** What the training goal means for the body objective kept on the profile. */
export function goalToObjetivo(goal: StarterGoal): Objetivo {
  if (goal === "muscle") return "bulking";
  if (goal === "fat-loss") return "cutting";
  return "manutencao";
}

export interface Prescription {
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
}

export function prescriptionFor(answers: StarterAnswers): Prescription {
  const base: Prescription =
    answers.goal === "strength"
      ? { sets: 4, repsMin: 4, repsMax: 6, restSec: 180 }
      : answers.goal === "fat-loss"
        ? { sets: 3, repsMin: 12, repsMax: 15, restSec: 60 }
        : { sets: 3, repsMin: 8, repsMax: 12, restSec: 90 };
  if (answers.experience === "beginner" || answers.goal === "comeback") {
    return { ...base, sets: Math.max(2, base.sets - 1) };
  }
  if (answers.experience === "advanced") return { ...base, sets: base.sets + 1 };
  return base;
}

/** Full body for up to 3 days, upper/lower for 4, push/pull/legs for 5 or more. */
export function templateFor(dayCount: number): RoutineTemplate {
  const id = dayCount <= 3 ? "full-body" : dayCount === 4 ? "upper-lower" : "ppl";
  return ROUTINE_TEMPLATES.find((tpl) => tpl.id === id) ?? ROUTINE_TEMPLATES[0]!;
}

/** Monday-first order, so "Sunday" lands at the end of the week. */
export function sortDays(days: number[]): number[] {
  return [...new Set(days)].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
}

/** Spread the chosen days over the routines, in order, round-robin. */
function spreadDays(routines: Routine[], days: number[]): Routine[] {
  if (!days.length) return routines;
  const buckets = routines.map<number[]>(() => []);
  days.forEach((day, i) => buckets[i % routines.length]?.push(day));
  return routines.map((routine, i) => ({ ...routine, diasSemana: buckets[i] ?? [] }));
}

export interface StarterPlan {
  template: RoutineTemplate;
  prescription: Prescription;
  routines: Routine[];
}

export function buildStarterPlan(
  answers: StarterAnswers,
  library: Exercise[],
  translate: (source: string) => string = (s) => s,
): StarterPlan {
  const days = sortDays(answers.days);
  const template = templateFor(days.length || DEFAULT_ANSWERS.days.length);
  const prescription = prescriptionFor(answers);

  let routines = buildTemplateRoutines(template, library, translate).map((routine) => ({
    ...routine,
    exercicios: routine.exercicios.map((exercise) => ({
      ...exercise,
      seriesAlvo: prescription.sets,
      repsMin: prescription.repsMin,
      repsMax: prescription.repsMax,
      descansoSeg: prescription.restSec,
    })),
  }));

  // Two training days on a three-day template: keep only what fits the week.
  if (days.length && days.length < routines.length) routines = routines.slice(0, days.length);

  return { template, prescription, routines: spreadDays(routines, days) };
}
