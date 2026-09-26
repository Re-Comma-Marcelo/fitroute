/**
 * Performance-drop detection with context.
 *
 * Compares the set the user just logged with the most recent logged set of the
 * same exercise at the same weight. A drop alone is not worth a message — the
 * coach first looks for a plausible cause (cross-training in the last 24–48h,
 * a soreness/energy note) and for whether the dip repeats across sessions.
 */
import { tx } from "@/lib/format";
import { PERFORMANCE_DIP_ADJUST_PCT, incrementoPara, roundToStep } from "@/lib/progression";
import type {
  CoachNote,
  CoachingCause,
  CrossTrainingKind,
  CrossTrainingLog,
  WorkoutSet,
} from "@/lib/types";

export interface DropInput {
  exerciseName: string;
  /** The set just completed. */
  current: { pesoKg: number; reps: number };
  /** Completed sets of this exercise, oldest first (see getExerciseHistory). */
  history: WorkoutSet[];
  /** workoutId -> ISO start date, used to group history into sessions. */
  sessionDate: (workoutId: string) => string | undefined;
  crossTraining: CrossTrainingLog[];
  recentNotes: CoachNote[];
  /** Workout the current set belongs to, excluded from the comparison. */
  currentWorkoutId?: string;
  /** Drives the equipment-realistic step (and the cross-training relevance check below). */
  equipamento?: string;
  grupoPrimario?: string;
}

export interface DropResult {
  cause: CoachingCause;
  message: string;
  repsLost: number;
  pesoKg: number;
  /** Suggested working weight when the coach recommends dialing back 5%. */
  suggestedKg?: number;
}

const CROSS_LABEL: Record<CrossTrainingKind, string> = {
  run: "a run",
  sport: "a sports session",
  bike: "a ride",
  walk: "a long walk",
  swim: "a swim",
  other: "another activity",
};

/**
 * Muscle groups a cardio activity plausibly fatigues — gates whether it's a
 * believable cause for THIS exercise's dip, instead of blaming any logged
 * activity for any exercise regardless of what either one actually trains
 * (the old check only looked at whether the exercise's own name contained a
 * push-lift keyword, never at what the cross-training itself worked).
 * "sport" and "other" are intentionally absent — too open-ended to assume a
 * muscle group, so those keep the old always-plausible behaviour.
 */
const CROSS_EMPHASIS: Partial<Record<CrossTrainingKind, string[]>> = {
  run: ["quads", "hamstrings", "glutes", "calves"],
  walk: ["quads", "hamstrings", "glutes", "calves"],
  bike: ["quads", "hamstrings", "glutes"],
  swim: ["shoulders", "back", "chest", "triceps", "core"],
};

function isRelevantCross(kind: CrossTrainingKind, grupoPrimario?: string): boolean {
  const emphasis = CROSS_EMPHASIS[kind];
  if (!emphasis || !grupoPrimario) return true;
  return emphasis.includes(grupoPrimario.trim().toLowerCase());
}

function hoursSince(iso: string): number {
  const then = new Date(`${iso.length <= 10 ? `${iso}T12:00:00` : iso}`).getTime();
  return (Date.now() - then) / 3_600_000;
}

/** Best reps per session at exactly this weight, oldest session first. */
function repsPerSession(
  history: WorkoutSet[],
  pesoKg: number,
  sessionDate: (id: string) => string | undefined,
): { workoutId: string; date: string; reps: number }[] {
  const byWorkout = new Map<string, number>();
  for (const s of history) {
    if (Math.abs(s.pesoKg - pesoKg) > 0.01) continue;
    byWorkout.set(s.workoutId, Math.max(byWorkout.get(s.workoutId) ?? 0, s.reps));
  }
  return [...byWorkout.entries()]
    .map(([workoutId, reps]) => ({ workoutId, reps, date: sessionDate(workoutId) ?? "" }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function detectPerformanceDrop(input: DropInput): DropResult | null {
  const { current, history, sessionDate, currentWorkoutId } = input;
  if (current.pesoKg <= 0 || current.reps <= 0) return null;

  const sessions = repsPerSession(
    history.filter((s) => s.workoutId !== currentWorkoutId),
    current.pesoKg,
    sessionDate,
  );
  const last = sessions[sessions.length - 1];
  if (!last) return null;

  const repsLost = last.reps - current.reps;
  if (repsLost <= 0) return null;

  const step = incrementoPara(input.equipamento ?? "", input.grupoPrimario);
  const suggestedKg = roundToStep(current.pesoKg * (1 - PERFORMANCE_DIP_ADJUST_PCT), step);

  // 1. Plausible external cause: cross-training in the last 48h that
  // plausibly fatigued the same muscle group as the exercise just logged.
  const cross = input.crossTraining.find((c) => {
    const h = hoursSince(c.data);
    return h >= 0 && h <= 48 && isRelevantCross(c.kind, input.grupoPrimario);
  });
  if (cross) {
    return {
      cause: "cross_training",
      repsLost,
      pesoKg: current.pesoKg,
      message: tx(
        "{reps} reps less on {exercise} today. You logged {activity} recently — that likely explains it. How are you feeling?",
        {
          reps: repsLost,
          exercise: input.exerciseName,
          activity: CROSS_LABEL[cross.kind] ?? CROSS_LABEL["other"]!,
        },
      ),
    };
  }

  // 2. A soreness / low-energy note from the last two days explains it too.
  const note = input.recentNotes.find((n) => hoursSince(n.createdAt) <= 48);
  if (note) {
    return {
      cause: "cross_training",
      repsLost,
      pesoKg: current.pesoKg,
      message: tx(
        "{reps} reps less on {exercise}. Makes sense with what you flagged: “{note}”. Keep the load, protect the movement.",
        { reps: repsLost, exercise: input.exerciseName, note: note.content.slice(0, 80) },
      ),
    };
  }

  // 3. Repeated pattern across three sessions -> name it, one suggestion only.
  const tail = sessions.slice(-2).map((s) => s.reps);
  const repeated =
    tail.length === 2 &&
    tail[0]! >= tail[1]! &&
    tail[1]! >= current.reps &&
    tail[0]! > current.reps;
  if (repeated) {
    return {
      cause: "pattern",
      repsLost,
      pesoKg: current.pesoKg,
      suggestedKg,
      message: tx(
        "Same weight, fewer reps, three sessions in a row on {exercise}. Time to dial the weight back to {suggested} and rebuild the reps. Your call.",
        { exercise: input.exerciseName, suggested: `${suggestedKg}kg` },
      ),
    };
  }

  // 4. One-off dip: light touch, no drama.
  return {
    cause: "one_off",
    repsLost,
    pesoKg: current.pesoKg,
    message: tx("A bit less than last time on {exercise}. Happens. Same plan next session.", {
      exercise: input.exerciseName,
    }),
  };
}
