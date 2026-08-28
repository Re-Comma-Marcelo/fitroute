/** Builds a starter routine from the 3 onboarding answers. Pure functions. */
import { normalizeName } from "./hevy";
import type { Exercise, Routine, RoutineExercise } from "../types";

export type StarterGoal = "hypertrophy" | "strength" | "conditioning";
export type StarterFrequency = "2-3" | "4" | "5+";
export type StarterExperience = "beginner" | "intermediate" | "advanced";

export interface StarterAnswers {
  goal: StarterGoal;
  frequency: StarterFrequency;
  experience: StarterExperience;
}

/** Full-body for low frequency, upper/lower split otherwise. */
const BLUEPRINTS: Record<StarterFrequency, { name: string; exercises: string[] }> = {
  "2-3": {
    name: "Full Body A",
    exercises: [
      "Barbell Squat",
      "Bench Press",
      "Barbell Row",
      "Dumbbell Shoulder Press",
      "Romanian Deadlift",
      "Plank",
    ],
  },
  "4": {
    name: "Upper A",
    exercises: [
      "Bench Press",
      "Barbell Row",
      "Dumbbell Shoulder Press",
      "Lat Pulldown",
      "Barbell Curl",
      "Tricep Rope Pushdown",
    ],
  },
  "5+": {
    name: "Push A",
    exercises: [
      "Bench Press",
      "Incline Dumbbell Press",
      "Dumbbell Shoulder Press",
      "Lateral Raise",
      "Tricep Rope Pushdown",
      "Cable Crossover",
    ],
  },
};

interface Prescription {
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
}

function prescriptionFor(answers: StarterAnswers): Prescription {
  const base: Prescription =
    answers.goal === "strength"
      ? { sets: 4, repsMin: 4, repsMax: 6, restSec: 180 }
      : answers.goal === "conditioning"
        ? { sets: 3, repsMin: 12, repsMax: 15, restSec: 60 }
        : { sets: 4, repsMin: 8, repsMax: 12, restSec: 90 };
  if (answers.experience === "beginner") return { ...base, sets: Math.max(2, base.sets - 1) };
  if (answers.experience === "advanced") return { ...base, sets: base.sets + 1 };
  return base;
}

export interface StarterPlan {
  name: string;
  description: string;
  exercises: { exercise: Exercise; prescription: Prescription }[];
}

export function buildStarterPlan(answers: StarterAnswers, library: Exercise[]): StarterPlan {
  const blueprint = BLUEPRINTS[answers.frequency];
  const prescription = prescriptionFor(answers);
  const byName = new Map(library.map((e) => [normalizeName(e.nome), e]));

  const picked = blueprint.exercises
    .map((name) => byName.get(normalizeName(name)))
    .filter((e): e is Exercise => Boolean(e));

  // Fall back to the library order if the catalog uses different names.
  const exercises = (picked.length >= 4 ? picked : library.slice(0, 6)).map((exercise) => ({
    exercise,
    prescription,
  }));

  return { name: blueprint.name, description: describe(answers), exercises };
}

function describe(answers: StarterAnswers): string {
  return `goal:${answers.goal} · frequency:${answers.frequency} · level:${answers.experience}`;
}

export function planToRoutine(
  plan: StarterPlan,
  newExercise: (exerciseId: string, ordem: number) => RoutineExercise,
): Routine {
  return {
    id: "",
    nome: plan.name,
    descricao: plan.description,
    exercicios: plan.exercises.map((item, i) => ({
      ...newExercise(item.exercise.id, i),
      seriesAlvo: item.prescription.sets,
      repsMin: item.prescription.repsMin,
      repsMax: item.prescription.repsMax,
      descansoSeg: item.prescription.restSec,
      notas: "",
    })),
  };
}
