/**
 * Evaluates checkpoints against logged training. A passed checkpoint becomes
 * achieved when its metric is hit, adjusted when there is a real reason for the
 * shortfall (cross-training load, a detected drop), and missed otherwise.
 */
import type { CrossTrainingLog, Workout, WorkoutSet } from "@/lib/types";
import type { Checkpoint } from "./types";
import { addDays, isoDay } from "./cadence";

export interface Evaluation {
  checkpoint: Checkpoint;
  next: Checkpoint;
  /** True when the checkpoint changed and should be persisted. */
  changed: boolean;
}

function bestLift(sets: WorkoutSet[], exerciseId: string, until: Date): number {
  return sets
    .filter((s) => s.exerciseId === exerciseId && s.concluida !== false)
    .reduce((max, s) => Math.max(max, s.pesoKg ?? 0), 0);
}

function sessionsBetween(workouts: Workout[], from: string, to: string): number {
  return workouts.filter(
    (w) => w.finalizadoEm && w.iniciadoEm.slice(0, 10) >= from && w.iniciadoEm.slice(0, 10) <= to,
  ).length;
}

/**
 * Was the metric behind this checkpoint reached on or before its target date?
 * `startWeightKg` (the weight the user began the route at) tells a weight
 * checkpoint which direction counts as progress — without it, "below target"
 * would read as success even for a bulking goal, where the target is above
 * where the user started.
 */
export function metricHit(
  cp: Checkpoint,
  workouts: Workout[],
  sets: WorkoutSet[],
  bodyWeightKg: number | null,
  startWeightKg?: number | null,
): boolean {
  const metric = cp.metric;
  if (!metric) return false;
  const target = new Date(cp.targetDate);
  if (metric.kind === "lift" && metric.exerciseId) {
    return bestLift(sets, metric.exerciseId, target) >= metric.value;
  }
  if (metric.kind === "sessions") {
    const from = isoDay(addDays(target, -30));
    return sessionsBetween(workouts, from, cp.targetDate) >= metric.value;
  }
  if (metric.kind === "weight" && bodyWeightKg != null) {
    if (Math.abs(bodyWeightKg - metric.value) <= 0.7) return true;
    // Gaining (target above where the route started): hit once at/above it.
    if (startWeightKg != null && metric.value > startWeightKg) return bodyWeightKg >= metric.value;
    // Losing, or direction unknown: hit once at/below it (the original rule).
    return bodyWeightKg <= metric.value;
  }
  return false;
}

/**
 * A shortfall counts as "the coach moved it" when something in the data
 * explains it: heavy cross-training, or a detected performance drop.
 */
export function hasContextualReason(
  cp: Checkpoint,
  cross: CrossTrainingLog[],
  hadDrop: boolean,
): boolean {
  if (hadDrop) return true;
  const from = isoDay(addDays(new Date(cp.targetDate), -21));
  const load = cross.filter((c) => c.data >= from && c.data <= cp.targetDate);
  return load.length >= 3;
}

export interface EvaluateInput {
  checkpoints: Checkpoint[];
  workouts: Workout[];
  sets: WorkoutSet[];
  cross: CrossTrainingLog[];
  bodyWeightKg: number | null;
  /** Weight the user started the route at, so a gain-goal checkpoint isn't misread as "below target = done". */
  startWeightKg?: number | null;
  hadDrop: boolean;
  now?: Date;
}

/** Pure pass over the route: returns the checkpoints that changed state. */
export function evaluateCheckpoints({
  checkpoints,
  workouts,
  sets,
  cross,
  bodyWeightKg,
  startWeightKg,
  hadDrop,
  now = new Date(),
}: EvaluateInput): Evaluation[] {
  const today = isoDay(now);
  const out: Evaluation[] = [];

  for (const cp of checkpoints) {
    const hit = metricHit(cp, workouts, sets, bodyWeightKg, startWeightKg);

    if (hit && cp.status !== "achieved") {
      out.push({
        checkpoint: cp,
        next: { ...cp, status: "achieved", achievedAt: today, updatedAt: new Date().toISOString() },
        changed: true,
      });
      continue;
    }
    if (hit || cp.targetDate >= today) continue;
    if (cp.status === "achieved" || cp.status === "missed") continue;

    // Passed and not hit.
    if (cp.status === "upcoming" && hasContextualReason(cp, cross, hadDrop)) {
      out.push({
        checkpoint: cp,
        next: {
          ...cp,
          status: "adjusted",
          targetDate: isoDay(addDays(new Date(cp.targetDate), 14)),
          updatedAt: new Date().toISOString(),
        },
        changed: true,
      });
      continue;
    }
    if (cp.status === "adjusted") {
      // Already moved once — leave it, it stays visible as adjusted until hit or
      // until the user reschedules it.
      continue;
    }
    out.push({
      checkpoint: cp,
      next: { ...cp, status: "missed", updatedAt: new Date().toISOString() },
      changed: true,
    });
  }
  return out;
}

/** The checkpoint the user is working towards right now. */
export function currentCheckpoint(checkpoints: Checkpoint[], now = new Date()): Checkpoint | null {
  const today = isoDay(now);
  const open = checkpoints
    .filter((c) => c.status === "upcoming" || c.status === "adjusted")
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  return open.find((c) => c.targetDate >= today) ?? open[0] ?? null;
}

/** Checkpoint nearest to a date, for attaching progress photos. */
export function nearestCheckpoint(checkpoints: Checkpoint[], date: string): Checkpoint | null {
  if (!checkpoints.length) return null;
  const target = new Date(date).getTime();
  return (
    [...checkpoints].sort(
      (a, b) =>
        Math.abs(new Date(a.targetDate).getTime() - target) -
        Math.abs(new Date(b.targetDate).getTime() - target),
    )[0] ?? null
  );
}
