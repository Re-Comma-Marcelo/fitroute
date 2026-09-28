/**
 * Evaluates checkpoints against logged training. A passed checkpoint becomes
 * achieved when its metric is hit, adjusted when there is a real reason for the
 * shortfall (cross-training load, a reported issue, a detected drop), and
 * missed otherwise.
 */
import type { CrossTrainingLog, Workout, WorkoutSet } from "@/lib/types";
import type { Checkpoint } from "./types";
import { addDays, isoDay } from "./cadence";

/** Minimal shape of a weekly check-in — just what a contextual reason needs. */
export interface CheckInFlag {
  /** ISO date (Monday) of the week this check-in covers. */
  weekKey: string;
  issues: string[];
}

export type AdjustReason = "cross_training" | "issue" | "performance_drop";

export interface Evaluation {
  checkpoint: Checkpoint;
  next: Checkpoint;
  /** True when the checkpoint changed and should be persisted. */
  changed: boolean;
  /** Why an "adjusted" change happened — unset for achieved/missed changes. */
  reason?: AdjustReason;
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
 * Which direction counts as progress for this route's weight checkpoints:
 * derived from the checkpoints themselves (earliest target value vs latest),
 * since that's always fresh. A profile's remembered "starting weight" can go
 * stale once a user sets a new goal in the opposite direction (e.g. a bulk
 * after a cut) without that field being refreshed, which briefly made a
 * freshly re-mapped route read every checkpoint as already achieved.
 */
function weightDirection(checkpoints: Checkpoint[]): 1 | -1 | null {
  const weightCps = checkpoints
    .filter((c) => c.metric?.kind === "weight")
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const first = weightCps[0]?.metric;
  const last = weightCps[weightCps.length - 1]?.metric;
  if (!first || !last || first.value === last.value) return null;
  return last.value > first.value ? 1 : -1;
}

/** Was the metric behind this checkpoint reached on or before its target date? */
export function metricHit(
  cp: Checkpoint,
  workouts: Workout[],
  sets: WorkoutSet[],
  bodyWeightKg: number | null,
  direction?: 1 | -1 | null,
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
    // Gaining: hit once at/above target. Losing, or direction unknown
    // (a route with only one weight checkpoint): hit once at/below it.
    return direction === 1 ? bodyWeightKg >= metric.value : bodyWeightKg <= metric.value;
  }
  return false;
}

/**
 * A shortfall counts as "the coach moved it" when something in the data
 * explains it: heavy cross-training, a reported issue (shoulder/back/knee/
 * tired) in a weekly check-in covering the run-up to this checkpoint, or a
 * detected performance drop. Returns which one, so the caller can say why
 * instead of a generic "adjusted".
 */
export function contextualReason(
  cp: Checkpoint,
  cross: CrossTrainingLog[],
  hadDrop: boolean,
  checkIns: CheckInFlag[] = [],
): AdjustReason | null {
  if (hadDrop) return "performance_drop";
  const from = isoDay(addDays(new Date(cp.targetDate), -21));
  const load = cross.filter((c) => c.data >= from && c.data <= cp.targetDate);
  if (load.length >= 3) return "cross_training";
  const flagged = checkIns.some(
    (c) => c.weekKey >= from && c.weekKey <= cp.targetDate && c.issues.some((i) => i !== "nothing"),
  );
  if (flagged) return "issue";
  return null;
}

export interface EvaluateInput {
  checkpoints: Checkpoint[];
  workouts: Workout[];
  sets: WorkoutSet[];
  cross: CrossTrainingLog[];
  bodyWeightKg: number | null;
  hadDrop: boolean;
  /** Weekly check-in issue flags, so a reported injury can explain a shortfall. */
  checkIns?: CheckInFlag[];
  now?: Date;
}

/** Pure pass over the route: returns the checkpoints that changed state. */
export function evaluateCheckpoints({
  checkpoints,
  workouts,
  sets,
  cross,
  bodyWeightKg,
  hadDrop,
  checkIns = [],
  now = new Date(),
}: EvaluateInput): Evaluation[] {
  const today = isoDay(now);
  const direction = weightDirection(checkpoints);
  const out: Evaluation[] = [];

  for (const cp of checkpoints) {
    const hit = metricHit(cp, workouts, sets, bodyWeightKg, direction);

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
    const reason = cp.status === "upcoming" ? contextualReason(cp, cross, hadDrop, checkIns) : null;
    if (reason) {
      out.push({
        checkpoint: cp,
        next: {
          ...cp,
          status: "adjusted",
          targetDate: isoDay(addDays(new Date(cp.targetDate), 14)),
          updatedAt: new Date().toISOString(),
        },
        changed: true,
        reason,
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
