/** Builds a warm-up ramp for a working weight. Pure. */
import { roundToStep } from "./progression";
import { makeSets, type ActiveExercise, type ActiveSet } from "./session-state";

const RAMP = [
  { pct: 0.5, reps: 8 },
  { pct: 0.7, reps: 5 },
  { pct: 0.85, reps: 3 },
];

/**
 * Warm-up sets (type "aquecimento") for a target working weight.
 * Light targets get a shorter ramp — three sets under 30kg is noise.
 */
export function buildWarmupSets(targetKg: number, step = 2.5): ActiveSet[] {
  if (!Number.isFinite(targetKg) || targetKg <= step * 2) return [];
  const ramp = targetKg < 40 ? RAMP.slice(1) : RAMP;
  return ramp.map((entry) => {
    const base = makeSets(1, [])[0]!;
    const peso = roundToStep(targetKg * entry.pct, step);
    return {
      ...base,
      id: `w_${Math.random().toString(36).slice(2, 9)}`,
      tipoSerie: "aquecimento" as const,
      pesoKg: String(peso),
      reps: String(entry.reps),
      sugPeso: peso,
      sugReps: entry.reps,
    };
  });
}

/**
 * The exercise with a warm-up ramp in front of its first working weight, or
 * null when there is nothing to ramp to (no weight yet, bodyweight, very light)
 * or it already has warm-up sets.
 */
export function withWarmup(ex: ActiveExercise): ActiveExercise | null {
  if (ex.sets.some((s) => s.tipoSerie === "aquecimento")) return null;
  const working = ex.sets.find((s) => s.tipoSerie !== "aquecimento");
  const target = Number(working?.pesoKg) || working?.sugPeso || 0;
  const warm = buildWarmupSets(target);
  if (!warm.length) return null;
  const sets = [...warm, ...ex.sets].map((s, i) => ({ ...s, serieNum: i + 1 }));
  return { ...ex, sets };
}
