/**
 * Builds the starter routines from the onboarding answers. Pure functions:
 * the caller saves what comes back. One routine per training day, from the
 * same templates the "Start from a template" sheet uses, so a new account
 * gets a whole week instead of a single day.
 */
import type { Experience, TrainingYears } from "../plan/types";
import {
  ROUTINE_TEMPLATES,
  buildTemplateRoutines,
  type FocusMuscle,
  type Pace,
  type RoutineTemplate,
} from "../routine-templates";
import type { Exercise, Objetivo, Routine, TrainingGoal } from "../types";

/**
 * Body-composition direction × training emphasis, not just a training style —
 * "build muscle" and "get stronger" alone read as near-synonyms to most
 * people. Standard bulk/maintain/recomp/cut framing (see e.g. Longland et al.
 * 2012 on recomposition, or any mainstream bulk-vs-cut guide) resolves that.
 */
export type StarterGoal =
  "muscle-gain" | "muscle-maintain" | "muscle-cut" | "fat-loss" | "strength" | "comeback";

export type StarterExperience = Experience;

export interface StarterAnswers {
  goal: StarterGoal;
  /** Weekdays picked for training, 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** How long they've trained, asked directly (matches the weekly plan interview). */
  trainingYears: TrainingYears;
  /** Short & few exercises vs. longer & more thorough sessions. null = today's default balance. */
  pace: Pace | null;
  /** Muscle groups to emphasize with an extra exercise — empty for no preference. */
  focusMuscles: FocusMuscle[];
}

/** Used for whatever the person skipped. */
export const DEFAULT_ANSWERS: StarterAnswers = {
  goal: "muscle-gain",
  days: [1, 3, 5],
  trainingYears: "1to3y",
  pace: null,
  focusMuscles: [],
};

/** Years under load only — the quiz doesn't ask about the last-6-months consistency the weekly interview does. */
export function yearsToExperience(years: TrainingYears): StarterExperience {
  if (years === "lt6m" || years === "6to12m") return "beginner";
  if (years === "1to3y") return "intermediate";
  return "advanced";
}

/** What the goal means for the body objective kept on the profile (drives calorie targets). */
export function goalToObjetivo(goal: StarterGoal): Objetivo {
  if (goal === "muscle-gain") return "bulking";
  if (goal === "muscle-cut" || goal === "fat-loss") return "cutting";
  return "manutencao"; // muscle-maintain, strength, comeback
}

/** What the goal means for training-day frequency guidance (src/lib/plan/frequency.ts). */
export function goalToTrainingGoal(goal: StarterGoal): TrainingGoal {
  if (goal === "strength") return "strength";
  if (goal === "fat-loss") return "fat-loss";
  if (goal === "comeback") return "comeback";
  return "muscle"; // muscle-gain, muscle-maintain, muscle-cut
}

export interface Prescription {
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
}

function baseFor(goal: StarterGoal): Prescription {
  if (goal === "strength") return { sets: 4, repsMin: 4, repsMax: 6, restSec: 180 };
  if (goal === "fat-loss") return { sets: 3, repsMin: 12, repsMax: 15, restSec: 60 };
  // muscle-gain / muscle-maintain / muscle-cut / comeback: standard hypertrophy range.
  return { sets: 3, repsMin: 8, repsMax: 12, restSec: 90 };
}

export function prescriptionFor(answers: StarterAnswers): Prescription {
  const base = baseFor(answers.goal);
  const experience = yearsToExperience(answers.trainingYears);
  if (experience === "beginner" || answers.goal === "comeback") {
    return { ...base, sets: Math.max(2, base.sets - 1) };
  }
  if (experience === "advanced") return { ...base, sets: base.sets + 1 };
  return base;
}

/**
 * Day counts that split evenly across a template's routine slots: full body
 * (any count — every session already covers the whole body), upper/lower
 * (2 slots, needs a multiple of 2), push/pull/legs (3 slots, needs a
 * multiple of 3). A count outside this set — 5 or 7 days, say — forced PPL
 * into an uneven 2/2/1 or 3/2/2 rotation: the same muscle hit three times
 * one week and twice the next for no programming reason, only because the
 * calendar day count didn't divide evenly. See the meta-analyses on training
 * frequency: each muscle should land on ~2x/week consistently, not "whatever
 * the leftover days happen to produce."
 */
const CLEAN_DAY_COUNTS = [1, 2, 3, 4, 6] as const;

/** The largest clean day count at or below `n`. */
export function nearestCleanDayCount(n: number): number {
  return [...CLEAN_DAY_COUNTS].reverse().find((c) => c <= n) ?? 1;
}

/** Full body for up to 3 days, upper/lower for 4, push/pull/legs for 6. */
export function templateFor(dayCount: number): RoutineTemplate {
  const clean = nearestCleanDayCount(dayCount);
  const id = clean <= 3 ? "full-body" : clean === 4 ? "upper-lower" : "ppl";
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
  const allDays = sortDays(answers.days);
  const dayCount = nearestCleanDayCount(allDays.length || DEFAULT_ANSWERS.days.length);
  // Keep only what a clean split needs — an extra, unevenly-distributed day defeats the point.
  const days = allDays.slice(0, dayCount);
  const template = templateFor(dayCount);
  const prescription = prescriptionFor(answers);

  let routines = buildTemplateRoutines(template, library, translate, {
    pace: answers.pace,
    focusMuscles: answers.focusMuscles,
  }).map((routine) => ({
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
