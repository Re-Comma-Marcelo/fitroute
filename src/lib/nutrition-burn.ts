import type { Workout } from "./types";

/**
 * Rough calorie burn from logged training. MET-based:
 * kcal/min = MET * 3.5 * kg / 200, with MET 5.0 for resistance training.
 * Deliberately labelled as an estimate in the UI — it is not a measurement.
 */
export function estimateBurn(workouts: Workout[], bodyWeightKg: number): number {
  const minutes = workouts.reduce((sum, w) => sum + w.duracaoSeg / 60, 0);
  if (minutes <= 0) return 0;
  const kcalPerMin = (5 * 3.5 * Math.max(35, bodyWeightKg)) / 200;
  return Math.round(minutes * kcalPerMin);
}
