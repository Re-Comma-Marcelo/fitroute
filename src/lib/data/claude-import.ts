import type { BridgePayload } from "../claude-bridge";
import { tx } from "../format";
import type { Routine } from "../types";
import { exercises } from "./mocks";
import { meals } from "./meals.mock";
import { saveRoutine, newRoutineExercise } from "./routines";
import { setPlannedMeal, SLOT_LABEL } from "./nutrition";
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
        warnings.push(tx('Unknown exercise "{id}" — it will be skipped.', { id: e.exerciseId }));
        return tx("{n}. (unknown exercise)", { n: i + 1 });
      }
      return `${i + 1}. ${ex.nome} — ${e.sets} × ${e.repsMin}-${e.repsMax}`;
    });
    return { title: tx("Routine · {name}", { name: payload.name }), lines, warnings };
  }

  if (payload.kind === "diet") {
    const lines = Object.entries(payload.days).map(([date, slots]) => {
      const parts = Object.entries(slots).map(([slot, mealId]) => {
        const slotLabel = tx(SLOT_LABEL[slot as keyof typeof SLOT_LABEL] ?? slot);
        const meal = meals.find((m) => m.id === mealId);
        if (!meal) {
          warnings.push(
            tx('Unknown meal "{id}" on {date} — it will be skipped.', { id: mealId, date }),
          );
          return tx("{slot}: (unknown)", { slot: slotLabel });
        }
        return `${slotLabel}: ${meal.name}`;
      });
      return `${date} — ${parts.join(", ")}`;
    });
    return {
      title: tx("Diet plan · {n} day(s)", { n: Object.keys(payload.days).length }),
      lines,
      warnings,
    };
  }

  return {
    title: tx("Coach note · {kind}", { kind: payload.noteKind }),
    lines: [
      payload.content,
      payload.tags.length ? tx("Tags: {tags}", { tags: payload.tags.join(", ") }) : "",
    ].filter(
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
    return tx('Added routine "{name}" with {n} exercises.', {
      name: saved.nome,
      n: saved.exercicios.length,
    });
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
    return tx("Planned {n} meal(s) across {days} day(s).", {
      n: count,
      days: Object.keys(payload.days).length,
    });
  }

  await saveCoachNote({
    kind: payload.noteKind,
    content: payload.content,
    tags: payload.tags,
  });
  return tx("Coach note saved — your coach will reference it on Train.");
}
