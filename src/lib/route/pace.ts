/**
 * One-glance answer to "am I still on my route?", derived from the checkpoints
 * the app already evaluates against your logs. No extra input needed.
 */
import type { Checkpoint } from "./types";
import { isoDay } from "./cadence";

export type RoutePace = "no_route" | "ahead" | "on_track" | "behind";

export interface RoutePaceResult {
  state: RoutePace;
  /** The next checkpoint you are working towards, when there is one. */
  next: Checkpoint | null;
  /** How many days the closest problem is overdue, for behind. */
  daysBehind: number;
}

export function routePace(checkpoints: Checkpoint[], now = new Date()): RoutePaceResult {
  if (!checkpoints.length) return { state: "no_route", next: null, daysBehind: 0 };
  const today = isoDay(now);
  const open = checkpoints
    .filter((c) => c.status === "upcoming" || c.status === "adjusted")
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const next = open.find((c) => c.targetDate >= today) ?? open[0] ?? null;

  const overdue = open.filter((c) => c.targetDate < today);
  const missed = checkpoints.filter((c) => c.status === "missed" && c.targetDate < today);
  if (overdue.length || missed.length) {
    const oldest = [...overdue, ...missed].sort((a, b) => a.targetDate.localeCompare(b.targetDate))[
      0
    ];
    const days = oldest
      ? Math.max(
          1,
          Math.round(
            (new Date(today).getTime() - new Date(oldest.targetDate).getTime()) / 86400000,
          ),
        )
      : 0;
    return { state: "behind", next, daysBehind: days };
  }

  // Anything achieved before its date means you are running ahead of the plan.
  const early = checkpoints.some(
    (c) => c.status === "achieved" && c.achievedAt && c.achievedAt < c.targetDate,
  );
  return { state: early ? "ahead" : "on_track", next, daysBehind: 0 };
}
