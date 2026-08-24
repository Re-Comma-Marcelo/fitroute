import type { BridgePayload } from "../claude-bridge";
import type { Routine } from "../types";
import { exercises } from "./mocks";
import { meals } from "./meals.mock";
import { saveRoutine, newRoutineExercise } from "./routines";
import { setPlannedMeal } from "./nutrition";
import { saveCoachNote } from "./coach-notes";

export interface ImportPreview {
  title: string;
  lines: string[];
  warnings: string[];
}

export function previewImport(payload: BridgePayload): ImportPreview {
  const warnings: string[] = [];

  if (payload.kind === "routine") {
    const lines = payload.exercises.map((e, i) => {
      const ex = exercises.find((x) => x.id === e.exerciseId);
      if (!ex) {
        warnings.push(`Unknown exercise "${e.exerciseId}" — it will be skipped.`);
        return `${i + 1}. (unknown exercise)`;
      }
      return `${i + 1}. ${ex.nome} — ${e.sets} × ${e.repsMin}-${e.repsMax}`;
    });
    return { title: `Routine · ${payload.name}`, lines, warnings };
  }

  if (payload.kind === "diet") {
    const lines = Object.entries(payload.days).map(([date, slots]) => {
      const parts = Object.entries(slots).map(([slot, mealId]) => {
        const meal = meals.find((m) => m.id === mealId);
        if (!meal) {
          warnings.push(`Unknown meal "${mealId}" on ${date} — it will be skipped.`);
          return `${slot}: (unknown)`;
        }
        return `${slot}: ${meal.name}`;
      });
      return `${date} — ${parts.join(", ")}`;
    });
    return { title: `Diet plan · ${Object.keys(payload.days).length} day(s)`, lines, warnings };
  }

  return {
    title: `Coach note · ${payload.noteKind}`,
    lines: [payload.content, payload.tags.length ? `Tags: ${payload.tags.join(", ")}` : ""].filter(
      Boolean,
    ),
    warnings,
  };
}

export async function applyImport(payload: BridgePayload): Promise<string> {
  if (payload.kind === "routine") {
    const valid = payload.exercises.filter((e) => exercises.some((x) => x.id === e.exerciseId));
    const routine: Routine = {
      id: "",
      nome: payload.name,
      descricao: payload.description,
      exercicios: valid.map((e, i) => ({
        ...newRoutineExercise(e.exerciseId, i),
        seriesAlvo: e.sets,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        descansoSeg: e.restSec,
        notas: e.notes,
      })),
    };
    const saved = await saveRoutine(routine);
    return `Added routine "${saved.nome}" with ${saved.exercicios.length} exercises.`;
  }

  if (payload.kind === "diet") {
    let count = 0;
    for (const [date, slots] of Object.entries(payload.days)) {
      for (const [slot, mealId] of Object.entries(slots)) {
        if (!meals.some((m) => m.id === mealId)) continue;
        await setPlannedMeal(date, slot as never, mealId);
        count++;
      }
    }
    return `Planned ${count} meal(s) across ${Object.keys(payload.days).length} day(s).`;
  }

  await saveCoachNote({
    kind: payload.noteKind,
    content: payload.content,
    tags: payload.tags,
  });
  return "Coach note saved — your coach will reference it on Train.";
}
