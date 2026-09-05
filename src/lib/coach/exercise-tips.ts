import { getExercise } from "@/lib/data/exercises";
import { getExerciseHistory } from "@/lib/data/workouts";
import { setE1rm } from "@/lib/e1rm";
import { isSerieDeCarga } from "@/lib/progression";
import { formatKg } from "@/lib/format";
import { tx } from "@/lib/format";
import type { Exercise, WorkoutSet } from "@/lib/types";

export interface ExerciseTipsResult {
  exercise: Exercise | null;
  /** Short form cues, generic-to-specific, always safe to read before a set. */
  tips: string[];
  /** Numbers pulled from the user's own log (empty when never trained). */
  lastLabel: string | null;
  bestLabel: string | null;
  sessions: number;
  stalled: boolean;
}

function isFreeWeight(equip: string): boolean {
  const e = equip.toLowerCase();
  return e.includes("barra") || e.includes("barbell") || e.includes("halter") || e.includes("dumb");
}

function isMachine(equip: string): boolean {
  const e = equip.toLowerCase();
  return e.includes("máquina") || e.includes("maquina") || e.includes("machine") || e.includes("cabo") || e.includes("cable");
}

function groupCue(group: string): string | null {
  const g = group.toLowerCase();
  if (g.includes("peito") || g.includes("chest")) {
    return tx("Keep the shoulder blades pulled back and down — the chest leads, not the shoulders.");
  }
  if (g.includes("costas") || g.includes("back")) {
    return tx("Start the pull with the elbows, not the hands, and pause a beat at the top.");
  }
  if (g.includes("perna") || g.includes("leg") || g.includes("quad") || g.includes("glute")) {
    return tx("Push the floor away with the whole foot and keep the knees tracking over the toes.");
  }
  if (g.includes("ombro") || g.includes("shoulder")) {
    return tx("Stop just short of shrugging — if the neck takes over, the load is too heavy.");
  }
  if (g.includes("braço") || g.includes("braco") || g.includes("arm") || g.includes("bic") || g.includes("tric")) {
    return tx("Lock the elbow in place so only the forearm moves; no swinging from the torso.");
  }
  if (g.includes("core") || g.includes("abdo")) {
    return tx("Breathe out as you brace and keep the ribs down — quality beats extra reps here.");
  }
  return null;
}

/**
 * Coaching cues for one movement: fixed technique guidance from the exercise
 * itself plus a read of the user's own recent sets. Pure heuristics — the
 * open-ended coaching lives in Claude over MCP.
 */
export async function getExerciseTips(exerciseId: string): Promise<ExerciseTipsResult> {
  const exercise = await getExercise(exerciseId);
  if (!exercise) {
    return { exercise: null, tips: [], lastLabel: null, bestLabel: null, sessions: 0, stalled: false };
  }

  let history: WorkoutSet[] = [];
  try {
    history = (await getExerciseHistory(exerciseId)).filter(isSerieDeCarga);
  } catch {
    history = [];
  }

  const tips: string[] = [];
  const cue = groupCue(exercise.grupoPrimario);
  if (cue) tips.push(cue);

  if (isFreeWeight(exercise.equipamento)) {
    tips.push(
      tx(
        "Free weight: control the way down for about two seconds — that is where most of the growth comes from.",
      ),
    );
  } else if (isMachine(exercise.equipamento)) {
    tips.push(
      tx(
        "Set the seat and pad so the joint lines up with the machine's pivot before the first rep.",
      ),
    );
  }
  tips.push(tx("Stop the set with 1–2 reps still in the tank unless you planned to go to failure."));

  const byWorkout = new Map<string, WorkoutSet[]>();
  for (const s of history) {
    const arr = byWorkout.get(s.workoutId) ?? [];
    arr.push(s);
    byWorkout.set(s.workoutId, arr);
  }
  const sessions = byWorkout.size;

  let lastLabel: string | null = null;
  let bestLabel: string | null = null;
  let stalled = false;

  if (history.length) {
    const lastId = history[history.length - 1]!.workoutId;
    const lastSets = byWorkout.get(lastId) ?? [];
    const topLast = lastSets.reduce((top, s) => (s.pesoKg > top.pesoKg ? s : top), lastSets[0]!);
    lastLabel = tx("{weight} x {reps}", {
      weight: formatKg(topLast.pesoKg),
      reps: topLast.reps,
    });

    const best = history.reduce((top, s) => (setE1rm(s) > setE1rm(top) ? s : top), history[0]!);
    bestLabel = tx("{weight} x {reps}", { weight: formatKg(best.pesoKg), reps: best.reps });

    const tops = [...byWorkout.values()].map((list) =>
      list.reduce((max, s) => Math.max(max, s.pesoKg), 0),
    );
    const lastThree = tops.slice(-3);
    stalled = lastThree.length === 3 && lastThree.every((w) => w === lastThree[0]);

    if (stalled) {
      tips.push(
        tx(
          "Same top weight for three sessions. Add one rep per set first; move the load only when every set hits the top of the range.",
        ),
      );
    }
  } else {
    tips.push(
      tx("First time on this one: pick a weight you could do twice more and learn the groove."),
    );
  }

  return { exercise, tips, lastLabel, bestLabel, sessions, stalled };
}
