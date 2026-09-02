/** Builds a finished workout from a hand-filled form (training logged offline). */
import type { Routine, Workout, WorkoutSet } from "./types";

export interface ManualEntryRow {
  exerciseId: string;
  nome: string;
  series: number;
  pesoKg: number;
  reps: number;
}

export interface ManualWorkoutInput {
  /** ISO date (yyyy-mm-dd). */
  data: string;
  durationMin: number;
  routine?: Routine | null;
  rows: ManualEntryRow[];
  notas?: string;
}

export interface ManualWorkoutDraft {
  workout: Workout;
  sets: WorkoutSet[];
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Rows with zero sets are dropped; volume mirrors the session calculation. */
export function buildManualWorkout(input: ManualWorkoutInput): ManualWorkoutDraft {
  const rows = input.rows.filter((r) => r.series > 0 && r.reps > 0);
  const startedAt = new Date(`${input.data}T12:00:00`);
  const workoutId = id("w");
  const duracaoSeg = Math.max(0, Math.round(input.durationMin * 60));

  const sets: WorkoutSet[] = [];
  rows.forEach((row, exIndex) => {
    for (let i = 0; i < row.series; i++) {
      sets.push({
        id: id("ws"),
        workoutId,
        exerciseId: row.exerciseId,
        ordemExercicio: exIndex,
        serieNum: i + 1,
        tipoSerie: "normal",
        pesoKg: row.pesoKg,
        reps: row.reps,
        concluida: true,
      });
    }
  });

  const volumeTotalKg = sets.reduce((total, s) => total + s.pesoKg * s.reps, 0);

  return {
    workout: {
      id: workoutId,
      routineId: input.routine?.id,
      iniciadoEm: startedAt.toISOString(),
      finalizadoEm: new Date(startedAt.getTime() + duracaoSeg * 1000).toISOString(),
      duracaoSeg,
      volumeTotalKg: Math.round(volumeTotalKg),
      notas: input.notas?.trim() ?? "",
      origem: input.routine ? "rotina" : "branco",
    },
    sets,
  };
}
