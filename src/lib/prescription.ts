import { formatNumber, tx } from "./format";
import { e1rm, pctOfE1rmForReps } from "./e1rm";
import { incrementoPara, isSerieDeCarga, roundToStep, type PrevSet } from "./progression";
import { RPE_EASY_MAX, RPE_NEAR_FAILURE_MIN } from "./rpe";
import { buildWarmupSets } from "./warmup";

/**
 * The app decides the work for you: rest length, working weight and reps.
 * Pure module — no React, no data access. Rules are literature-flavoured
 * defaults, not medical advice:
 *  - Heavy, low-rep compound work needs 2-5 min to restore force output.
 *  - Hypertrophy ranges (8-12) recover well enough in 60-120 s.
 *  - Isolation work needs the least, 45-75 s.
 */

const COMPOUND_GROUPS = new Set([
  "chest",
  "back",
  "legs",
  "quads",
  "quadriceps",
  "hamstrings",
  "glutes",
]);

export interface ExerciseShape {
  grupoPrimario?: string;
  equipamento?: string;
  repsMin: number;
  repsMax: number;
}

/** Compound-ish: big muscle group moved with a barbell/machine/bodyweight pattern. */
export function isCompound(ex: ExerciseShape): boolean {
  const group = (ex.grupoPrimario ?? "").trim().toLowerCase();
  const equip = (ex.equipamento ?? "").trim().toLowerCase();
  if (!COMPOUND_GROUPS.has(group)) return false;
  return (
    equip.startsWith("barbell") ||
    equip.startsWith("machine") ||
    equip.startsWith("body") ||
    equip.startsWith("smith") ||
    equip.startsWith("dumbbell")
  );
}

/**
 * Rest the app picks from how heavy the prescribed range is.
 * Returns whole seconds, always > 0 so a countdown always runs.
 */
export function restForExercise(ex: ExerciseShape): number {
  const top = Math.max(1, ex.repsMax || ex.repsMin || 10);
  const compound = isCompound(ex);
  let base: number;
  if (top <= 6) base = 180;
  else if (top <= 8) base = 150;
  else if (top <= 12) base = 90;
  else base = 60;
  if (compound && top <= 8) base += 30; // heavy compounds need the extra minute-ish
  if (!compound) base = Math.max(45, base - 30);
  return base;
}

/** Explains the rest choice in one line. */
export function restReason(ex: ExerciseShape): string {
  const seg = restForExercise(ex);
  const min = Math.round((seg / 60) * 10) / 10;
  const top = Math.max(1, ex.repsMax || 10);
  if (top <= 8) {
    return tx("Heavy range ({min}-{max} reps): rest ~{rest} min so force output comes back.", {
      min: ex.repsMin,
      max: ex.repsMax,
      rest: formatNumber(min, 1),
    });
  }
  if (top <= 12) {
    return tx("{min}-{max} reps: ~{rest} min rest keeps the reps honest without cooling down.", {
      min: ex.repsMin,
      max: ex.repsMax,
      rest: formatNumber(min, 1),
    });
  }
  return tx("High reps: short rest ({rest} s) keeps the set quality and the pump.", { rest: seg });
}

export interface SetPrescription {
  /** Working weight the app fills in (kg, rounded to the nearest usable step). */
  pesoKg: number;
  reps: number;
  /** Coach line shown above the sets. */
  line: string;
  /** Warm-up instruction, when a warm-up set makes sense. */
  warmup?: { pesoKg: number; reps: number; line: string };
}

/**
 * Calculates today's work from recent sets: no user-set goals needed.
 * `anteriores` are the sets from the last completed session of this exercise.
 */
export function prescribeExercise(
  ex: ExerciseShape,
  anteriores: PrevSet[],
): SetPrescription | null {
  const work = anteriores.filter(isSerieDeCarga).filter((s) => s.pesoKg > 0 && s.reps > 0);
  if (work.length === 0) return null;

  const best = work.reduce((max, s) => Math.max(max, e1rm(s.pesoKg, s.reps)), 0);
  if (best <= 0) return null;

  const rpes = work.map((s) => s.rpe).filter((v): v is number => typeof v === "number" && v > 0);
  const rpeMedio = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
  const topReps = Math.max(...work.map((s) => s.reps));
  const heaviest = work.reduce((max, s) => Math.max(max, s.pesoKg), 0);
  const step = incrementoPara(ex.equipamento ?? "", ex.grupoPrimario);

  // Target reps: mid-to-top of the range, biased to the top when the last
  // session was comfortable.
  const easy = topReps >= ex.repsMax && (rpeMedio === null || rpeMedio <= RPE_EASY_MAX);
  const hard = rpeMedio !== null && rpeMedio >= RPE_NEAR_FAILURE_MIN;
  const reps = easy ? ex.repsMax : hard ? ex.repsMin : Math.round((ex.repsMin + ex.repsMax) / 2);

  // Weight from the estimated 1RM for that rep target, kept close to what the
  // user actually handled so the jump is never wild.
  const fromE1rm = best * pctOfE1rmForReps(reps);
  let pesoKg = roundToStep(fromE1rm, step);
  const ceiling = heaviest + step * (easy ? 1 : 0);
  const floor = hard ? heaviest - step : heaviest * 0.9;
  pesoKg = Math.min(ceiling, Math.max(floor, pesoKg));
  pesoKg = roundToStep(pesoKg, step);

  const line = hard
    ? tx("{weight} kg x {reps} — last time was near your limit, so hold here and own every rep.", {
        weight: formatNumber(pesoKg, 1),
        reps,
      })
    : easy
      ? tx("{weight} kg x {reps} — should feel heavy, but you need all {reps} reps.", {
          weight: formatNumber(pesoKg, 1),
          reps,
        })
      : tx("{weight} kg x {reps} — aim for all {reps}, stop one rep before form breaks.", {
          weight: formatNumber(pesoKg, 1),
          reps,
        });

  // Warm-up hint: describes the same ramp buildWarmupSets() would actually add
  // (see warmup.ts), so this coach tip and the real "add warm-up" action never
  // disagree on how to ramp up. Only the last (heaviest) ramp step is shown —
  // enough to tell the user a warm-up is worth it and roughly where it lands.
  const ramp = buildWarmupSets(pesoKg, step);
  const lastRampSet = ramp[ramp.length - 1];
  const warmup = lastRampSet
    ? {
        pesoKg: Number(lastRampSet.pesoKg),
        reps: Number(lastRampSet.reps),
        line: tx("Warm up first — {sets} ramp-up set(s), the last at {weight} kg x {reps}.", {
          sets: ramp.length,
          weight: formatNumber(Number(lastRampSet.pesoKg), 1),
          reps: Number(lastRampSet.reps),
        }),
      }
    : undefined;

  return warmup ? { pesoKg, reps, line, warmup } : { pesoKg, reps, line };
}
