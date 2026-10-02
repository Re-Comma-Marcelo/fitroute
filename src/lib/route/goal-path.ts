/**
 * The route's main goal made measurable: a realistic target for the time
 * frame, and the checkpoints on the way there. Pure functions — the
 * onboarding suggests with them, auto-map builds the route with them.
 */
import {
  FAT_LOSS_WEEKLY_PACE_PCT,
  GAIN_WARN_WEEKLY_PCT,
  GENERAL_GAIN_WEEKLY_PCT,
  LEAN_GAIN_WEEKLY_PCT,
  MUSCLE_GAIN_MONTHLY_PCT,
} from "@/lib/plan/guardrails";
import type { Experience } from "@/lib/types";

/**
 * Which way the body weight should move for this goal: "gain" is a lean
 * bulk, "bulk" is gaining with fat accepted.
 */
export type WeightDirection = "gain" | "bulk" | "maintain" | "recomp" | "lose";

/**
 * A recomposition (build muscle while losing fat) runs a smaller deficit than
 * a straight cut (Barakat et al. 2020 on body recomposition), so the scale
 * moves slower: about half the fat-loss pace is used.
 */
const RECOMP_WEEKLY_PACE_PCT = 0.0035;

/**
 * Weekly strength progress on a main lift, as a share of the current
 * working weight. Estimates, not a law: novices add load almost every
 * session, while the rate falls steeply with training age (Rhea et al. 2003
 * dose-response meta-analysis; Kraemer & Ratamess 2004, ACSM progression
 * models). Kept conservative so a checkpoint is something you can hit.
 */
export const LIFT_WEEKLY_PACE_PCT: Record<Experience, number> = {
  beginner: 0.015, // ~6%/month
  intermediate: 0.006, // ~2.5%/month
  advanced: 0.0025, // ~1%/month
};

/** Body weight the research supports after `weeks`, rounded to 0.5 kg. */
export function suggestTargetWeight(
  currentKg: number,
  direction: WeightDirection,
  weeks: number,
  experience: Experience,
): number {
  const pace =
    direction === "gain"
      ? LEAN_GAIN_WEEKLY_PCT[experience]
      : direction === "bulk"
        ? GENERAL_GAIN_WEEKLY_PCT
        : direction === "lose"
          ? -FAT_LOSS_WEEKLY_PACE_PCT
          : direction === "recomp"
            ? -RECOMP_WEEKLY_PACE_PCT
            : 0;
  return roundTo(currentKg * (1 + pace * weeks), 0.5);
}

/** Likely muscle in a gain over `weeks` (Aragon's range), rounded to 0.5 kg. */
export function estimateMuscleKg(
  currentKg: number,
  weeks: number,
  experience: Experience,
): [number, number] {
  const months = weeks / 4.345;
  const [low, high] = MUSCLE_GAIN_MONTHLY_PCT[experience];
  return [roundTo(currentKg * low * months, 0.5), roundTo(currentKg * high * months, 0.5)];
}

/** True when a weight gain runs past the pace where it is mostly fat. */
export function isFastGain(currentKg: number, targetKg: number, weeks: number): boolean {
  return weeks > 0 && (targetKg - currentKg) / weeks > currentKg * GAIN_WARN_WEEKLY_PCT;
}

/** Working weight a lift can realistically reach after `weeks`, on 2.5 kg plates. */
export function suggestLiftTarget(
  currentKg: number,
  weeks: number,
  experience: Experience,
): number {
  const target = currentKg * (1 + LIFT_WEEKLY_PACE_PCT[experience] * weeks);
  // Always at least one plate step up, so the goal is never "stay where you are".
  return Math.max(roundTo(target, 2.5), roundTo(currentKg, 2.5) + 2.5);
}

/** True when a lift target asks for clearly more than the research pace. */
export function isAmbitiousLift(
  currentKg: number,
  targetKg: number,
  weeks: number,
  experience: Experience,
): boolean {
  return targetKg - currentKg > (suggestLiftTarget(currentKg, weeks, experience) - currentKg) * 1.5;
}

/**
 * Values on the way from `start` to `target`, one per checkpoint date: a
 * straight line in time. The last one is the target itself.
 */
export function pathValues(
  start: number,
  target: number,
  startIso: string,
  dates: string[],
  step: number,
): number[] {
  const t0 = new Date(startIso).getTime();
  const total = new Date(dates[dates.length - 1] ?? startIso).getTime() - t0;
  return dates.map((date, i) => {
    if (i === dates.length - 1 || total <= 0) return target;
    const share = (new Date(date).getTime() - t0) / total;
    return roundTo(start + (target - start) * share, step);
  });
}

export function roundTo(value: number, step: number): number {
  return Math.round(Math.round(value / step) * step * 10) / 10;
}
