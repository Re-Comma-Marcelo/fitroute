/**
 * One shared coach context. Checkpoint generation, the weekly check-in and the
 * in-workout chat all read the same picture of the user: goal, plan, training
 * history, cross-training load and the current checkpoint.
 */
import { getCrossTraining } from "@/lib/data/coaching";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { getRoutines } from "@/lib/data/routines";
import { getWorkoutLog } from "@/lib/data/workouts";
import { getBodyWeightLog } from "@/lib/data/body-weight";
import { getCheckpoints } from "@/lib/data/route";
import { currentCheckpoint } from "./status";
import type { Checkpoint } from "./types";
import { formatKg } from "@/lib/format";

export interface CoachContext {
  goal: {
    objetivo: string;
    startWeightKg: number | null;
    targetWeightKg: number | null;
    deadline: string | null;
  };
  currentWeightKg: number | null;
  weeklyTarget: number;
  sessionsLast30: number;
  routines: { nome: string; exercicios: string[] }[];
  bestLifts: { exerciseId: string; nome: string; kg: number }[];
  crossTrainingLast21: { kind: string; minutes: number }[];
  checkpoint: Checkpoint | null;
}

export async function buildCoachContext(): Promise<CoachContext> {
  const [profile, routines, exercises, log, cross, weights, checkpoints] = await Promise.all([
    getProfile(),
    getRoutines(),
    getExercises(),
    getWorkoutLog(),
    getCrossTraining(),
    getBodyWeightLog(),
    getCheckpoints(),
  ]);

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString().slice(0, 10);
  const cutoff21 = new Date();
  cutoff21.setDate(cutoff21.getDate() - 21);
  const iso21 = cutoff21.toISOString().slice(0, 10);

  const best = new Map<string, number>();
  for (const s of log.sets) {
    if (s.concluida === false) continue;
    best.set(s.exerciseId, Math.max(best.get(s.exerciseId) ?? 0, s.pesoKg ?? 0));
  }

  return {
    goal: {
      objetivo: profile.objetivo,
      startWeightKg: profile.pesoInicialKg ?? null,
      targetWeightKg: profile.pesoMetaKg ?? null,
      deadline: profile.metaPrazo ?? null,
    },
    currentWeightKg: weights[0]?.pesoKg ?? profile.pesoKg ?? null,
    weeklyTarget: profile.metaTreinosSemana,
    sessionsLast30: log.workouts.filter((w) => w.finalizadoEm && w.iniciadoEm.slice(0, 10) >= sinceIso)
      .length,
    routines: routines.map((r) => ({
      nome: r.nome,
      exercicios: r.exercicios
        .map((e) => exercises.find((x) => x.id === e.exerciseId)?.nome ?? e.exerciseId)
        .slice(0, 10),
    })),
    bestLifts: [...best.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([exerciseId, kg]) => ({
        exerciseId,
        nome: exercises.find((e) => e.id === exerciseId)?.nome ?? exerciseId,
        kg,
      })),
    crossTrainingLast21: cross
      .filter((c) => c.data >= iso21)
      .map((c) => ({ kind: c.kind, minutes: c.duracaoMin })),
    checkpoint: currentCheckpoint(checkpoints),
  };
}

/** One line the coach can drop into any answer, or null when there is no route. */
export function checkpointContextLine(cp: Checkpoint | null): string | null {
  if (!cp) return null;
  return `Current checkpoint: ${cp.title} by ${cp.targetDate}${
    cp.metric?.kind === "lift" ? ` (target ${formatKg(cp.metric.value)})` : ""
  }.`;
}
