import {
  perWorkoutStats,
  rpeTrend,
  sessionsSinceWeightIncrease,
  isSameWeightForLastN,
} from "./signals";
import type { CoachInsight } from "./types";
import { FATIGUE_PLATEAU_DELOAD_PCT } from "@/lib/progression";
import { RPE_FATIGUE_MIN } from "@/lib/rpe";
import type { Exercise, Workout, WorkoutSet } from "@/lib/types";

export interface PlateauFlag {
  insight: CoachInsight;
  /** Extra lines shown when the card is expanded. */
  reasoning: string[];
  action: string;
}

/**
 * Flags the most notable stall among the lifts the user tracks.
 * Returns null when nothing in the logged history is worth surfacing.
 */
export function detectPlateau(
  trackedIds: string[],
  exercises: Exercise[],
  workouts: Workout[],
  sets: WorkoutSet[],
): PlateauFlag | null {
  const candidates: { flag: PlateauFlag; score: number }[] = [];

  for (const id of trackedIds) {
    const exercise = exercises.find((e) => e.id === id);
    if (!exercise) continue;
    const history = sets.filter((s) => s.exerciseId === id && s.concluida);
    const stats = perWorkoutStats(history, workouts).filter((s) => s.maxWeight > 0);
    if (stats.length < 3) continue;

    const stalledSessions = sessionsSinceWeightIncrease(stats);
    const flatRun = isSameWeightForLastN(stats, 3);
    const last = stats[stats.length - 1]!;
    const weeks = Math.max(
      1,
      Math.round(
        (new Date(last.date).getTime() -
          new Date(stats[Math.max(0, stats.length - 3)]!.date).getTime()) /
          (86400000 * 7),
      ),
    );

    if (!flatRun && stalledSessions < 3) continue;

    const fatigued = rpeTrend(stats) === "up" || (last.avgRpe ?? 0) >= RPE_FATIGUE_MIN;
    const reasoning = [
      `Top set has sat at ${last.maxWeight} kg for the last ${Math.max(3, stalledSessions)} sessions.`,
      `${stats.length} logged sessions of ${exercise.nome} in your history.`,
    ];
    if (last.avgRpe) {
      reasoning.push(
        fatigued
          ? `Average effort on those sets is ${last.avgRpe} RPE — you're working hard for the same load.`
          : `Average effort is ${last.avgRpe} RPE, so there's likely room left in the tank.`,
      );
    }

    candidates.push({
      score: Math.max(3, stalledSessions) + (fatigued ? 1 : 0),
      flag: {
        insight: {
          id: `plateau-${id}`,
          scope: "week",
          severity: fatigued ? "warning" : "nudge",
          title: `${exercise.nome} hasn't moved in ${weeks} week${weeks === 1 ? "" : "s"}`,
          body: fatigued
            ? `${exercise.nome} is flat while effort climbs — a lighter deload week is probably the fastest way through.`
            : `${exercise.nome} is flat across your recent sessions. Changing the rep range is usually enough to break it.`,
          plateauType: fatigued ? "fatigue" : "single-exercise",
          exerciseId: id,
        },
        reasoning,
        action: fatigued
          ? `Next session: drop to ~${Math.round((1 - FATIGUE_PLATEAU_DELOAD_PCT) * 100)}% of the current load, keep the reps, and rebuild from there.`
          : "Next session: shift down the rep range (e.g. 5-8 instead of 8-12) and add load once you hit the top.",
      },
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]!.flag;
}
