/** Reads the body-weight log as a rate, so the goal gets a projected date. */
import type { BodyWeightEntry } from "./types";

export interface WeightPace {
  /** kg per week (negative when losing). */
  ratePerWeek: number;
  /** ISO date when the goal is reached at the current pace, null when never. */
  projectedDate: string | null;
  /** True when the pace moves away from the goal. */
  wrongWay: boolean;
  /** Weeks between the projection and the deadline (negative = late). */
  weeksVsDeadline: number | null;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Uses the last ~8 weeks of entries (min 2 points spanning 5+ days). */
export function weightPace(
  entries: BodyWeightEntry[],
  goalKg: number | undefined,
  deadline?: string,
  now = Date.now(),
): WeightPace | null {
  if (!goalKg || entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.data.localeCompare(b.data));
  const window = sorted.filter((e) => now - new Date(e.data).getTime() <= 8 * WEEK_MS);
  const points = window.length >= 2 ? window : sorted.slice(-2);
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const spanMs = new Date(last.data).getTime() - new Date(first.data).getTime();
  if (spanMs < 5 * 24 * 60 * 60 * 1000) return null;

  const ratePerWeek = ((last.pesoKg - first.pesoKg) / spanMs) * WEEK_MS;
  const remaining = goalKg - last.pesoKg;
  if (Math.abs(remaining) < 0.2) {
    return { ratePerWeek, projectedDate: last.data, wrongWay: false, weeksVsDeadline: null };
  }
  const wrongWay = Math.sign(remaining) !== Math.sign(ratePerWeek) || Math.abs(ratePerWeek) < 0.05;
  if (wrongWay) {
    return { ratePerWeek, projectedDate: null, wrongWay: true, weeksVsDeadline: null };
  }

  const weeksNeeded = remaining / ratePerWeek;
  const projected = new Date(now + weeksNeeded * WEEK_MS);
  const weeksVsDeadline = deadline
    ? (new Date(deadline).getTime() - projected.getTime()) / WEEK_MS
    : null;

  return {
    ratePerWeek,
    projectedDate: projected.toISOString().slice(0, 10),
    wrongWay: false,
    weeksVsDeadline: weeksVsDeadline === null ? null : Math.round(weeksVsDeadline),
  };
}
