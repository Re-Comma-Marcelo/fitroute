import { isoDate, setPlannedMeal, weekDates } from "../data/nutrition";
import { saveRoutine } from "../data/routines";
import type { Routine, RoutineExercise } from "../types";
import { DAY_KEYS, type GeneratedPlan, type PlanDay } from "./types";

function routineFor(day: PlanDay): Routine {
  const exercicios: RoutineExercise[] = day.exercises.map((ex, i) => ({
    id: `rex_${day.day}_${i}_${Math.random().toString(36).slice(2, 8)}`,
    exerciseId: ex.exerciseId,
    ordem: i,
    seriesAlvo: ex.sets,
    repsMin: ex.repsMin,
    repsMax: ex.repsMax,
    descansoSeg: ex.restSec,
    notas: ex.note,
  }));
  return {
    id: `rot_plan_${day.day}_${Date.now().toString(36)}`,
    nome: day.label,
    descricao: day.why,
    exercicios,
  };
}

/**
 * Activating a plan writes into the SAME structures manual mode uses: routines
 * and the week's planned meals. Nothing here is plan-only.
 */
export async function applyPlan(plan: GeneratedPlan): Promise<{ routines: number; meals: number }> {
  const gymDays = plan.days.filter((d) => d.kind === "gym" && d.exercises.length > 0);
  let routines = 0;
  for (const day of gymDays) {
    await saveRoutine(routineFor(day));
    routines += 1;
  }

  const dates = weekDates();
  const today = isoDate(new Date());
  let meals = 0;
  for (const meal of plan.diet.meals) {
    for (const date of dates) {
      if (date < today) continue;
      await setPlannedMeal(date, meal.slot, meal.mealId);
      meals += 1;
    }
  }
  return { routines, meals };
}

export function planDayOrder(plan: GeneratedPlan): PlanDay[] {
  return [...plan.days].sort((a, b) => DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day));
}
